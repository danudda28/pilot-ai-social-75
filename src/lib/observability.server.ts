/** Faza 5: jurnal utilizare AI, jurnal erori, limite zilnice, webhooks de ieșire către CRM. Server only. */
import { createHmac } from "crypto";

/** Limite zilnice de apeluri AI per plan (generare postări, imagini, agent etc.). */
export const AI_DAILY_LIMITS: Record<string, number> = {
  free: 10,
  basic: 50,
  pro: 200,
  business: 1000,
};

/** Cost estimativ USD per 1M tokeni (input/output) pentru modelele folosite. */
export const MODEL_COSTS: Record<string, { in: number; out: number }> = {
  "google/gemini-2.5-flash": { in: 0.15, out: 0.6 },
  "google/gemini-2.5-pro": { in: 1.25, out: 10 },
  "openai/gpt-5-mini": { in: 0.25, out: 2 },
  "openai/gpt-image-2": { in: 5, out: 0 },
};

export function estimateCostUsd(model: string, tokensIn: number, tokensOut: number): number {
  const c = MODEL_COSTS[model] ?? { in: 0.15, out: 0.6 };
  return (tokensIn * c.in + tokensOut * c.out) / 1_000_000;
}

/** Best-effort: nu aruncă niciodată. */
export async function logAiUsage(admin: any, entry: {
  brandId?: string | null; userId?: string | null; feature: string; model: string;
  usage?: { promptTokens?: number; completionTokens?: number } | null;
}) {
  try {
    await admin.from("ai_usage_log").insert({
      brand_id: entry.brandId ?? null,
      user_id: entry.userId ?? null,
      feature: entry.feature,
      model: entry.model,
      tokens_in: entry.usage?.promptTokens ?? 0,
      tokens_out: entry.usage?.completionTokens ?? 0,
    });
  } catch (e: any) {
    console.warn("[ai_usage]", e?.message);
  }
}

/** Best-effort: nu aruncă niciodată. */
export async function logError(admin: any, source: string, message: string, context: Record<string, unknown> = {}, brandId?: string | null) {
  try {
    await admin.from("error_log").insert({
      brand_id: brandId ?? null,
      source,
      message: String(message).slice(0, 500),
      context,
    });
  } catch (e: any) {
    console.warn("[error_log]", e?.message);
  }
}

/** Verifică limita zilnică de apeluri AI pentru utilizator, pe baza planului. Aruncă eroare prietenoasă la depășire. */
export async function checkAiDailyLimit(supabase: any, userId: string, plan: string) {
  const limit = AI_DAILY_LIMITS[plan] ?? AI_DAILY_LIMITS.free;
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", dayStart.toISOString());
  if ((count ?? 0) >= limit) {
    throw new Error(`Ai atins limita zilnică de ${limit} generări AI pentru planul tău. Revino mâine sau fă upgrade.`);
  }
  return { limit, used: count ?? 0 };
}

/** Trimite un eveniment către webhook-urile active ale brandului (CRM extern). Semnat HMAC sha256. */
export async function fireBrandWebhooks(admin: any, brandId: string, event: string, payload: Record<string, unknown>) {
  try {
    const { data: hooks } = await admin
      .from("brand_webhooks")
      .select("id,url,secret,events")
      .eq("brand_id", brandId)
      .eq("active", true)
      .contains("events", [event]);
    for (const hook of hooks ?? []) {
      const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });
      const signature = createHmac("sha256", hook.secret).update(body).digest("hex");
      try {
        const res = await fetch(hook.url, {
          method: "POST",
          headers: { "content-type": "application/json", "x-socialspark-signature": signature, "x-socialspark-event": event },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (e: any) {
        await logError(admin, "brand_webhook", e?.message ?? "webhook eșuat", { url: hook.url, event }, brandId);
      }
    }
  } catch (e: any) {
    console.warn("[brand_webhooks]", e?.message);
  }
}
