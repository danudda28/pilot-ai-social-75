import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const HashInput = z.object({
  topic: z.string().min(2).max(500),
  platform: z.enum(["instagram", "facebook", "both"]).default("both"),
  language: z.string().default("ro"),
  count: z.number().int().min(5).max(30).default(15),
});

export const suggestHashtags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => HashInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const prompt = `Generează ${data.count} hashtaguri optime pentru ${data.platform === "both" ? "Instagram și Facebook" : data.platform} pe tema: "${data.topic}".
Limba: ${data.language === "ro" ? "română (cu posibile hashtaguri internaționale)" : data.language}.
Mixează: 40% nișă (sub 100k posts), 40% medii (100k-1M), 20% mari (1M+).
Răspunde STRICT cu JSON: {"hashtags":[{"tag":"#exemplu","reach":"nisa|medie|mare","reason":"de ce"}]}.`;

    const { text } = await generateText({ model: gateway("google/gemini-2.5-flash"), prompt });
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as { hashtags: Array<{ tag: string; reach: string; reason: string }> };
      return parsed;
    } catch {
      throw new Error("AI a returnat format invalid.");
    }
  });

const TimesInput = z.object({
  industry: z.string().min(2).max(200),
  platform: z.enum(["instagram", "facebook", "both"]).default("both"),
  audience: z.string().max(300).optional(),
  goal: z.enum(["awareness", "engagement", "conversie", "trafic"]).default("engagement"),
});

export const suggestBestTimes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TimesInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const prompt = `Recomandă cele mai bune ore de postare pentru piața din România.
Industrie: ${data.industry}
Platforme: ${data.platform === "both" ? "Instagram + Facebook" : data.platform}
Audiență: ${data.audience ?? "general"}
Obiectiv: ${data.goal}

Răspunde STRICT cu JSON:
{
  "slots":[
    {"day":"luni","hour":"08:00","platform":"instagram","why":"motivul scurt în română"},
    ... 7-10 sloturi
  ],
  "summary":"un paragraf scurt cu strategie în limba română"
}`;

    const { text } = await generateText({ model: gateway("google/gemini-2.5-flash"), prompt });
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try {
      return JSON.parse(cleaned) as {
        slots: Array<{ day: string; hour: string; platform: string; why: string }>;
        summary: string;
      };
    } catch {
      throw new Error("AI a returnat format invalid.");
    }
  });
