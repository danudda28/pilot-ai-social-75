import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  postId: z.string().uuid(),
  prompt: z.string().min(5).max(1500),
});

/**
 * Generates an image with Lovable AI Gateway (Gemini Nano Banana),
 * uploads it to the private `post-images` bucket, saves the path on the
 * post and returns a signed URL the client can render.
 */
export const generatePostImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // Verify post belongs to user
    const { data: post, error: postErr } = await context.supabase
      .from("generated_posts")
      .select("id,user_id")
      .eq("id", data.postId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (postErr) throw new Error(postErr.message);
    if (!post) throw new Error("Postare inexistentă.");

    const visualPrompt = `Fotografie profesională pentru social media (Instagram/Facebook), stil editorial, lumină naturală, compoziție atractivă, fără text suprapus. ${data.prompt}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: visualPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 402) throw new Error("Creditele AI s-au epuizat.");
      if (res.status === 429) throw new Error("Prea multe cereri. Reîncearcă în câteva secunde.");
      throw new Error(`Generare imagine eșuată: ${res.status} ${errText}`);
    }

    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("AI nu a returnat imagine.");

    // Decode base64 to bytes
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Upload with admin client so we bypass RLS reliably; path is scoped per user.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${context.userId}/${data.postId}-${Date.now()}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("post-images")
      .upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) throw new Error(`Upload eșuat: ${upErr.message}`);

    // Save path on the post
    const { error: updErr } = await context.supabase
      .from("generated_posts")
      .update({ image_url: path })
      .eq("id", data.postId)
      .eq("user_id", context.userId);
    if (updErr) throw new Error(updErr.message);

    // Signed URL valid 7 days for the UI
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("post-images")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signErr) throw new Error(signErr.message);

    return { path, signedUrl: signed.signedUrl };
  });

/**
 * Returns a fresh signed URL for a previously generated image path.
 */
export const getPostImageUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ path: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Path must start with the user's id
    if (!data.path.startsWith(`${context.userId}/`)) {
      throw new Error("Acces interzis.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("post-images")
      .createSignedUrl(data.path, 60 * 60 * 24 * 7);
    if (error) throw new Error(error.message);
    return { signedUrl: signed.signedUrl };
  });
