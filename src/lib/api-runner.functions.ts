import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const Input = z.object({
  count: z.number().int().min(1).max(50),
  prompt: z.string().min(1).max(500).optional(),
  model: z.string().optional(),
  delayMs: z.number().int().min(0).max(5000).optional(),
});

async function assertAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

async function callOnce(providerModel: any, prompt: string): Promise<{ ok: true; text: string; ms: number } | { ok: false; error: string; ms: number }> {
  const started = Date.now();
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { text } = await generateText({
        model: providerModel,
        prompt,
        maxRetries: 0,
      });
      return { ok: true, text: text.slice(0, 200), ms: Date.now() - started };
    } catch (e: any) {
      lastErr = e?.message || String(e);
      const status = e?.statusCode || e?.status;
      // Retry only on rate limit / transient
      if (status === 429 || status === 503 || status === 500) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      break;
    }
  }
  return { ok: false, error: lastErr, ms: Date.now() - started };
}

export const runApiCalls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider.chatModel(data.model || "google/gemini-2.5-flash");
    const prompt = data.prompt || "Spune 'OK' într-un singur cuvânt.";
    const delay = data.delayMs ?? 250;

    const results: Array<{ i: number; ok: boolean; ms: number; text?: string; error?: string }> = [];
    for (let i = 0; i < data.count; i++) {
      const r = await callOnce(model, prompt);
      results.push({ i: i + 1, ...(r as any) });
      if (i < data.count - 1 && delay > 0) await new Promise(res => setTimeout(res, delay));
    }

    const ok = results.filter(r => r.ok).length;
    const avgMs = Math.round(results.reduce((a, r) => a + r.ms, 0) / results.length);
    return { total: results.length, ok, failed: results.length - ok, avgMs, results };
  });
