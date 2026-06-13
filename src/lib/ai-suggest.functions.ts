import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

export const suggestImprovements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { data: post } = await context.supabase.from("generated_posts")
      .select("title,copy,hashtags,platform,call_to_action").eq("id", data.postId)
      .eq("user_id", context.userId).maybeSingle();
    if (!post) throw new Error("Postare inexistentă.");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const prompt = `Analizează această postare ${post.platform} și dă 3-5 sugestii concrete de îmbunătățire în limba română (hook mai puternic, CTA mai clar, hashtaguri mai bune, structură, lungime). Răspunde STRICT cu JSON: {"score": 0-100, "strengths": ["..."], "improvements": ["..."]}.

Titlu: ${post.title ?? ""}
Copy: ${post.copy ?? ""}
Hashtaguri: ${post.hashtags ?? ""}
CTA: ${post.call_to_action ?? ""}`;

    const { text } = await generateText({ model: gateway("google/gemini-2.5-flash"), prompt });
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try { return JSON.parse(cleaned); } catch { throw new Error("AI a returnat format invalid."); }
  });
