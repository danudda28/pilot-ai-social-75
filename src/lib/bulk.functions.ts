import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const BulkInput = z.object({
  businessType: z.string().min(2).max(200),
  domain: z.string().min(2).max(200),
  tone: z.enum(["profesional", "prietenos", "premium", "amuzant", "direct"]),
  goal: z.enum(["vanzare", "awareness", "promovare", "educare", "testimonial"]),
  platform: z.enum(["instagram", "facebook", "both"]),
  contentType: z.enum(["static", "carousel", "video", "reels"]),
  extraContext: z.string().max(500).optional(),
  count: z.number().int().min(2).max(15),
});

const goalsRo: Record<string, string> = {
  vanzare: "vânzare directă", awareness: "creștere notorietate", promovare: "promovare ofertă",
  educare: "educare audiență", testimonial: "testimonial / social proof",
};

export const generatePostsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => BulkInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { data: profile } = await context.supabase
      .from("users_profiles")
      .select("posts_remaining,subscription_plan")
      .eq("user_id", context.userId)
      .maybeSingle();
    const remaining = profile?.posts_remaining ?? 0;
    if (remaining < data.count) {
      throw new Error(`Ai doar ${remaining} postări rămase în planul ${profile?.subscription_plan?.toUpperCase() ?? "FREE"}. Reduce numărul sau fă upgrade.`);
    }

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const basePrompt = `Ești un copywriter senior pentru social media, specializat pe afaceri locale din România. Scrii ÎN LIMBA ROMÂNĂ, cu diacritice, natural, cu personalitate.

CONTEXT BRAND
- Domeniu: ${data.domain}
- Tip afacere: ${data.businessType}
- Ton: ${data.tone}
- Obiectiv: ${goalsRo[data.goal]}
- Platformă: ${data.platform === "both" ? "Instagram și Facebook" : data.platform}
- Tip conținut: ${data.contentType}
${data.extraContext ? `- Context: ${data.extraContext}` : ""}

REGULI: emoji relevante (max 1-2/paragraf), hook puternic la început, copy aerisit cu line-breaks, CTA clar, hashtaguri mix nișă+larg.

GENEREAZĂ ${data.count} POSTĂRI DIFERITE, fiecare cu unghi propriu (ex: ofertă, beneficiu, story client, behind the scenes, tip util, întrebare, before/after, recomandare, etc.). NU repeta hook-uri sau structuri.

Răspunde STRICT cu JSON valid (fără markdown, fără text înainte/după):
{
  "posts": [
    {
      "title": "max 60 caractere",
      "copy": "3-6 paragrafe scurte cu \\n\\n, emoji, CTA final",
      "short_copy": "max 2 propoziții cu 1 emoji",
      "hashtags": "10-15 hashtaguri separate prin spațiu",
      "visual_idea": "descriere concretă imagine/video",
      "call_to_action": "max 8 cuvinte"
    }
  ]
}`;

    const { text } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      prompt: basePrompt,
    });

    let parsed: { posts: Array<Record<string, string>> };
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI a returnat un format invalid. Reîncearcă.");
    }

    const posts = (parsed.posts ?? []).slice(0, data.count);
    if (posts.length === 0) throw new Error("AI nu a generat nicio postare. Reîncearcă.");

    const rows = posts.map(p => ({
      user_id: context.userId,
      platform: data.platform,
      content_type: data.contentType,
      title: p.title ?? null,
      copy: p.copy ?? null,
      short_copy: p.short_copy ?? null,
      hashtags: p.hashtags ?? null,
      visual_idea: p.visual_idea ?? null,
      call_to_action: p.call_to_action ?? null,
      status: "draft",
    }));

    const { data: inserted, error } = await context.supabase
      .from("generated_posts")
      .insert(rows)
      .select("id,title");
    if (error) throw new Error(error.message);

    await context.supabase
      .from("users_profiles")
      .update({ posts_remaining: Math.max(0, remaining - posts.length) })
      .eq("user_id", context.userId);

    return { count: posts.length, posts: inserted ?? [] };
  });
