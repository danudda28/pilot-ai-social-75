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

    // Plan / quota check
    const { data: profile } = await context.supabase
      .from("users_profiles")
      .select("posts_remaining,subscription_plan")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profile && (profile.posts_remaining ?? 0) <= 0) {
      throw new Error(`Limita planului ${profile.subscription_plan?.toUpperCase() ?? "FREE"} a fost atinsă. Fă upgrade pentru mai multe postări.`);
    }


    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const goalsRo: Record<string, string> = {
      vanzare: "vânzare directă", awareness: "creștere notorietate", promovare: "promovare ofertă",
      educare: "educare audiență", testimonial: "testimonial / social proof",
    };

    const prompt = `Ești un copywriter senior pentru social media, specializat pe afaceri locale din România. Scrii ÎN LIMBA ROMÂNĂ, natural, cald, cu personalitate — niciodată tradus din engleză, niciodată corporate-stiff.

CONTEXT BRAND
- Domeniu de activitate: ${data.domain}
- Tip afacere: ${data.businessType}
- Ton dorit: ${data.tone}
- Obiectiv postare: ${goalsRo[data.goal]}
- Platformă: ${data.platform === "both" ? "Instagram și Facebook" : data.platform}
- Tip conținut: ${data.contentType}
${data.extraContext ? `- Context suplimentar de la client: ${data.extraContext}` : ""}

REGULI DE COPY
1. Scrie ROMÂNEȘTE corect, cu diacritice (ă, â, î, ș, ț). Fără englezisme inutile.
2. Folosește EMOJI relevante pentru domeniul afacerii (ex: salon ✂️💇‍♀️💅✨, restaurant 🍝🍷🔥, clinică 🦷💎😊, service auto 🔧🚗⚙️, magazin online 🛍️📦💫). Maxim 1–2 emoji per paragraf, plasate natural — nu spam.
3. Începe cu un HOOK puternic (întrebare, statement îndrăzneț, mic insight) care oprește scroll-ul.
4. Folosește SUBTEXTE elegante: propoziții scurte, ritm dinamic, line-breaks aerisite. Niciun bloc compact de text.
5. Vorbește cu cititorul la persoana a doua ("tu", "pentru tine"), apropiat dar respectuos.
6. CTA-ul trebuie să fie clar, acționabil și ușor de urmat (rezervă, scrie-ne în DM, sună la, comandă acum etc.).
7. Hashtag-urile: mix între nișă (#salonbucuresti, #restaurantcluj) și mai largi (#romania, #smallbusinessro). Fără hashtaguri spam.
8. Ideea vizuală trebuie să fie concretă și filmabilă/fotografiabilă, nu abstractă.

Răspunde STRICT cu JSON valid, fără markdown, fără text înainte sau după. Structura:
{
  "title": "titlu scurt, accroșant, max 60 caractere",
  "copy": "postarea completă (3-6 paragrafe scurte separate cu \\n\\n, cu emoji relevante și subtexte aerisite). Hook puternic la început, story/valoare la mijloc, CTA la final.",
  "short_copy": "varianta scurtă pentru story sau caption rapid, max 2 propoziții, tot cu 1 emoji relevant",
  "hashtags": "#hashtag1 #hashtag2 ... (10-15 hashtaguri relevante, separate prin spațiu, fără virgule)",
  "visual_idea": "descriere concretă a imaginii/video-ului recomandat — ce se vede, ce lumină, ce atmosferă",
  "call_to_action": "CTA scurt, direct, max 8 cuvinte",
  "image_suggestion": "sugestie practică pentru fotograf/creator: subiect, cadru, recuzită",
  "recommended_date": "zi din săptămână + interval orar optim pentru publicare (ex: Joi între 18:00 și 20:00) cu o scurtă justificare"
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

    // Decrement quota (best effort)
    if (profile) {
      await context.supabase
        .from("users_profiles")
        .update({ posts_remaining: Math.max(0, (profile.posts_remaining ?? 0) - 1) })
        .eq("user_id", context.userId);
    }

    return {
      post: inserted,
      ai: {
        image_suggestion: parsed.image_suggestion,
        recommended_date: parsed.recommended_date,
      },
    };
  });
