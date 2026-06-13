import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const GenerateInput = z.object({
  businessType: z.string().min(2).max(200),
  domain: z.string().min(2).max(200),
  tone: z.enum(["profesional", "prietenos", "premium", "amuzant", "direct"]),
  goal: z.enum(["vanzare", "awareness", "promovare", "educare", "testimonial"]),
  platform: z.enum(["instagram", "facebook", "both"]),
  contentType: z.enum(["static", "carousel", "video", "reels"]),
  extraContext: z.string().max(500).optional(),
});

export const generatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const goalsRo: Record<string, string> = {
      vanzare: "vânzare directă", awareness: "creștere notorietate", promovare: "promovare ofertă",
      educare: "educare audiență", testimonial: "testimonial / social proof",
    };

    const prompt = `Ești un copywriter expert în social media pentru afaceri din România.
Domeniu de activitate: ${data.domain}
Tip afacere: ${data.businessType}
Ton: ${data.tone}
Obiectiv: ${goalsRo[data.goal]}
Platformă: ${data.platform === "both" ? "Instagram și Facebook" : data.platform}
Tip conținut: ${data.contentType}
${data.extraContext ? `Context suplimentar: ${data.extraContext}` : ""}

Generează o postare profesională în limba română. Răspunde STRICT în format JSON valid, fără markdown sau text adițional, cu această structură:
{
  "title": "titlu scurt accrocant",
  "copy": "textul lung complet al postării (3-6 paragrafe scurte, cu emoji potrivite)",
  "short_copy": "varianta scurtă, max 2 propoziții",
  "hashtags": "#hashtag1 #hashtag2 ... (8-15 hashtaguri relevante separate prin spațiu)",
  "visual_idea": "descrierea ideii vizuale pentru postare",
  "call_to_action": "call to action scurt și clar",
  "image_suggestion": "sugestie pentru imagine/video",
  "recommended_date": "sugestie zi și ora optimă pentru publicare în română"
}`;

    const { text } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      prompt,
    });

    let parsed: Record<string, string>;
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI a returnat un format invalid. Reîncearcă.");
    }

    // Save to DB
    const { data: inserted, error } = await context.supabase
      .from("generated_posts")
      .insert({
        user_id: context.userId,
        platform: data.platform,
        content_type: data.contentType,
        title: parsed.title ?? null,
        copy: parsed.copy ?? null,
        short_copy: parsed.short_copy ?? null,
        hashtags: parsed.hashtags ?? null,
        visual_idea: parsed.visual_idea ?? null,
        call_to_action: parsed.call_to_action ?? null,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      post: inserted,
      ai: {
        image_suggestion: parsed.image_suggestion,
        recommended_date: parsed.recommended_date,
      },
    };
  });
