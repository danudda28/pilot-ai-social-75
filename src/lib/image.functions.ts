import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  postId: z.string().uuid(),
  prompt: z.string().min(5).max(1500),
  offerText: z.string().max(300).optional(),
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
    // Verify post belongs to user
    const { data: post, error: postErr } = await context.supabase
      .from("generated_posts")
      .select("id,user_id")
      .eq("id", data.postId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (postErr) throw new Error(postErr.message);
    if (!post) throw new Error("Postare inexistentă.");

    // Detect promo / discount intent in either the visual prompt or extra context
    const combined = `${data.prompt} ${data.offerText ?? ""}`;
    const promoRegex = /(reducer\w*|ofert\w*|discount|promo\w*|sold\w*|black\s*friday|cadou|gratis|\d{1,2}\s?%|\-\s?\d{1,2}\s?%)/i;
    const hasPromo = promoRegex.test(combined);

    // Extract a short promo headline (max ~40 chars) from offerText for the badge.
    // Long sentences kill text legibility — we keep just the key info: percent + period.
    function extractPromoHeadline(text: string): { headline: string; period: string } {
      const pctMatch = text.match(/(\d{1,2})\s?%/);
      const periodMatch = text.match(/(\d{1,2}\s*(?:ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|ian|feb|mar|apr|iun|iul|aug|sep|oct|nov|dec)[^,.]*?(?:\d{1,2}\s*(?:ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie|ian|feb|mar|apr|iun|iul|aug|sep|oct|nov|dec)[^,.]*)?)/i);
      const headline = pctMatch ? `-${pctMatch[1]}%` : "OFERTĂ";
      const period = periodMatch ? periodMatch[0].trim() : "";
      return { headline, period };
    }

    let promoBlock = "";
    if (hasPromo) {
      const { headline, period } = extractPromoHeadline(data.offerText ?? data.prompt);
      promoBlock = `\n\nIMPORTANT — TEXT OVERLAY ON THE IMAGE (this is mandatory, the image MUST contain readable text):
Add a large, bold, perfectly legible promotional badge / sticker overlay on the image with the following text rendered in clean sans-serif typography in CORRECT Romanian (mandatory diacritics ă â î ș ț, no typos):
- BIG HEADLINE: "${headline}"
- SUBLINE (smaller, below): "${period || "Ofertă limitată"}"
The badge should be a bright contrasting circle, rounded rectangle, or diagonal ribbon (red, yellow, or accent color) placed in a top corner of the photo so it doesn't cover the main subject. Typography must be sharp, well-kerned, and 100% spelled correctly — no missing letters, no gibberish, no fake characters, no English unless it's a real brand name. This text overlay is the most important part of the image.`;
    }

    const { buildLockedImagePrompt } = await import("./identity-lock.server");
    const visualPrompt =
      buildLockedImagePrompt({
        brief: data.prompt,
        angle: "editorial product/service frame",
        visualIdea: data.prompt,
        hasReference: false,
        aspect: "1:1",
      }) + promoBlock;

    const { getGeminiApiKey, generateGeminiImage } = await import("./gemini.server");
    let bytes: Uint8Array;
    if (getGeminiApiKey()) {
      bytes = await generateGeminiImage(visualPrompt, { aspectRatio: "1:1" });
    } else {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("Missing GEMINI_API_KEY (sau LOVABLE_API_KEY)");

      const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-image-2",
          prompt: visualPrompt,
          quality: "low",
          size: "1024x1024",
          n: 1,
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
      if (!b64) throw new Error("AI nu a returnat imagine. Reîncearcă.");
      const binary = atob(b64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    }

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

/**
 * Uploads a user-provided image (base64 data URL) for a post.
 * Max ~6 MB after decoding. Accepts PNG/JPG/WEBP.
 */
export const uploadPostImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      postId: z.string().uuid(),
      dataUrl: z.string().min(20),
      mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Verify ownership
    const { data: post, error: pErr } = await context.supabase
      .from("generated_posts")
      .select("id")
      .eq("id", data.postId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (pErr || !post) throw new Error("Postare inexistentă.");

    const base64 = data.dataUrl.replace(/^data:[^;]+;base64,/, "");
    if (base64.length > 8_500_000) throw new Error("Imagine prea mare (max 6 MB).");

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const ext = data.mimeType === "image/jpeg" ? "jpg" : data.mimeType === "image/webp" ? "webp" : "png";
    const path = `${context.userId}/${data.postId}-upload-${Date.now()}.${ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.storage
      .from("post-images")
      .upload(path, bytes, { contentType: data.mimeType, upsert: true });
    if (upErr) throw new Error(`Upload eșuat: ${upErr.message}`);

    await context.supabase
      .from("generated_posts")
      .update({ image_url: path })
      .eq("id", data.postId)
      .eq("user_id", context.userId);

    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("post-images")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (sErr) throw new Error(sErr.message);
    return { path, signedUrl: signed.signedUrl };
  });
