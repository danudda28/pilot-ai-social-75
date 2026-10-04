import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GRAPH = "https://graph.facebook.com/v21.0";

async function assertAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

async function getUserToken(context: any): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("meta_connections")
    .select("user_access_token")
    .eq("user_id", context.userId)
    .not("user_access_token", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.user_access_token) throw new Error("Nu ai o conexiune Facebook activă. Conectează-te din Integrări.");
  return data.user_access_token;
}

async function graphGet(path: string, token: string) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${GRAPH}/${path}${sep}access_token=${encodeURIComponent(token)}`);
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json;
}

export const listAdAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const token = await getUserToken(context);
    try {
      const j = await graphGet("me/adaccounts?fields=id,name,account_status&limit=50", token);
      return { accounts: (j.data ?? []) as { id: string; name: string; account_status: number }[], error: null as string | null };
    } catch (e: any) {
      return { accounts: [], error: e.message as string };
    }
  });

const ENDPOINTS: Record<string, (act: string) => string> = {
  account: (a) => `${a}?fields=id,name,account_status,currency,timezone_name`,
  campaigns: (a) => `${a}/campaigns?fields=id,name,status&limit=5`,
  adsets: (a) => `${a}/adsets?fields=id,name,status&limit=5`,
  ads: (a) => `${a}/ads?fields=id,name,status&limit=5`,
  insights: (a) => `${a}/insights?fields=impressions,spend&date_preset=last_30d`,
};

export const runMarketingCalls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      adAccountId: z.string().regex(/^act_\d+$/),
      endpoints: z.array(z.enum(["account", "campaigns", "adsets", "ads", "insights"])).min(1),
      count: z.number().int().min(1).max(50),
      delayMs: z.number().int().min(0).max(5000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const token = await getUserToken(context);
    const results: { i: number; endpoint: string; ok: boolean; ms: number; error?: string }[] = [];
    for (let i = 0; i < data.count; i++) {
      const ep = data.endpoints[i % data.endpoints.length];
      const started = Date.now();
      let ok = false;
      let err = "";
      for (let attempt = 0; attempt < 3 && !ok; attempt++) {
        try {
          await graphGet(ENDPOINTS[ep](data.adAccountId), token);
          ok = true;
        } catch (e: any) {
          err = e.message;
          if (!/rate|limit|temporar|unexpected|try again/i.test(err)) break;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
      results.push({ i: i + 1, endpoint: ep, ok, ms: Date.now() - started, error: ok ? undefined : err });
      if (data.delayMs) await new Promise((r) => setTimeout(r, data.delayMs));
    }
    const success = results.filter((r) => r.ok).length;
    return { total: results.length, success, rate: Math.round((success / results.length) * 100), results };
  });
