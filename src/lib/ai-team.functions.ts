import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { botAllowed, getBot, type BotId } from "./ai-team";

export const getTeamAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("users_profiles").select("subscription_plan").eq("user_id", context.userId).maybeSingle();
    return { plan: (data?.subscription_plan as string) ?? "free" };
  });

const ChatInput = z.object({
  botId: z.enum(["sofia", "victor", "ana", "radu", "dana", "emil", "sorin", "gabi"]),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) })).min(1).max(40),
});

export const chatWithBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Serviciul AI nu este configurat.");
    const bot = getBot(data.botId)!;

    const { data: profile } = await context.supabase.from("users_profiles").select("subscription_plan").eq("user_id", context.userId).maybeSingle();
    const plan = (profile?.subscription_plan as string) ?? "free";
    if (!botAllowed(plan, data.botId as BotId)) throw new Error(`${bot.name} este disponibil din planul Pro. Fă upgrade ca să-l folosești.`);

    const { checkAiDailyLimit, logAiUsage } = await import("./observability.server");
    await checkAiDailyLimit(context.supabase, context.userId, plan);

    const { resolveBrandId, loadBrandContext, brandContextBlock, BRAND_RULES } = await import("./brand-context.server");
    const brandId = await resolveBrandId(context.supabase, context.userId);
    const ctx = brandId ? await loadBrandContext(context.supabase, brandId).catch(() => null) : null;

    const system = `${bot.system}
Faci parte din echipa AI SocialSpark, pentru o afacere mică din România. Răspunzi ÎN ROMÂNĂ, cu diacritice, clar, structurat cu titluri scurte și liste (markdown). Fii concret și practic.
${ctx ? `${BRAND_RULES}\n${brandContextBlock(ctx)}` : "Nu ai încă informații confirmate despre afacere. Nu inventa detalii (prețuri, adrese, oferte); întreabă utilizatorul sau sugerează completarea Brand Brain."}
Dacă cererea ține de alt coleg din echipă (Sofia social media, Victor texte, Ana suport, Radu vânzări, Dana analiză, Emil email, Sorin SEO, Gabi grafică), poți menționa scurt că el/ea te poate ajuta mai bine.`;

    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const model = "google/gemini-2.5-flash";
    let result;
    try {
      result = await generateText({ model: gateway(model), system, messages: data.messages });
    } catch (e: any) {
      const status = e?.statusCode ?? e?.status;
      if (status === 429) throw new Error("Prea multe cereri acum. Încearcă din nou peste un minut.");
      if (status === 402) throw new Error("Creditele AI s-au terminat. Contactează administratorul.");
      throw new Error("Robotul nu a putut răspunde acum. Încearcă din nou.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await logAiUsage(supabaseAdmin, { brandId, userId: context.userId, feature: `team_${bot.id}`, model, usage: result.usage as any });
    if (!result.text.trim()) throw new Error("Robotul nu a returnat niciun răspuns.");
    return { reply: result.text, usedBrandBrain: !!ctx };
  });
