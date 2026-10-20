import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

const campaignInput = z.object({
  name: z.string().trim().min(2).max(120),
  kind: z.enum(["promotie", "lansare", "eveniment", "sezonier", "notorietate"]),
  offer: z.string().max(500).nullable().optional(),
  goal: z.string().max(200).nullable().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const listCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brandId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { resolveBrandId } = await import("./brand-context.server");
    const brandId = await resolveBrandId(context.supabase, context.userId, data.brandId);
    if (!brandId) return { brandId: null, campaigns: [] };
    const { data: rows, error } = await context.supabase.from("campaigns").select("*").eq("brand_id", brandId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((r: any) => r.id);
    const { data: posts } = ids.length
      ? await context.supabase.from("generated_posts").select("campaign_id,status").in("campaign_id", ids)
      : { data: [] as { campaign_id: string | null; status: string }[] };
    const counts = new Map<string, Record<string, number>>();
    for (const p of posts ?? []) {
      if (!p.campaign_id) continue;
      const c = counts.get(p.campaign_id) ?? { draft: 0, scheduled: 0, published: 0, failed: 0 };
      c[p.status] = (c[p.status] ?? 0) + 1;
      counts.set(p.campaign_id, c);
    }
    return { brandId, campaigns: (rows ?? []).map((r: any) => ({ ...r, counts: counts.get(r.id) ?? { draft: 0, scheduled: 0, published: 0, failed: 0 } })) };
  });

export const saveCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => campaignInput.extend({ id: z.string().uuid().optional(), brandId: z.string().uuid(), status: z.enum(["activa", "pauza", "incheiata"]).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, brandId, ...fields } = data;
    if (fields.start_date && fields.end_date && fields.end_date < fields.start_date) throw new Error("Data de final trebuie să fie după data de start.");
    if (id) {
      const { error } = await context.supabase.from("campaigns").update(fields).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await context.supabase.from("campaigns")
      .insert({ ...fields, brand_id: brandId, organization_id: "00000000-0000-0000-0000-000000000000", created_by: context.userId })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateCampaignPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), count: z.number().int().min(1).max(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Serviciul AI nu este configurat.");
    const { data: c } = await context.supabase.from("campaigns").select("*").eq("id", data.id).maybeSingle();
    if (!c) throw new Error("Campanie inexistentă.");
    const { loadBrandContext, brandContextBlock, BRAND_RULES, parseJson, findBannedWords } = await import("./brand-context.server");
    const ctx = await loadBrandContext(context.supabase, c.brand_id);
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { text } = await generateText({
      model: createLovableAiGatewayProvider(apiKey)("google/gemini-2.5-flash"),
      system: `Ești social media managerul afacerii. Scrii în română, cu diacritice. ${BRAND_RULES}
Oferta și perioada din <campaign> sunt confirmate de utilizator; le poți menționa exact cum sunt, fără să le modifici.
Scrie exact ${data.count} postări variate pentru campanie (anunț, detalii, beneficii, întrebări, ultima șansă etc.).
Răspunde STRICT cu JSON: {"posts":[{"title","copy","hashtags","call_to_action","visual_idea"}]}`,
      prompt: `<campaign>${JSON.stringify({ name: c.name, kind: c.kind, offer: c.offer, goal: c.goal, start: c.start_date, end: c.end_date })}</campaign>\n${brandContextBlock(ctx)}`,
    });
    const posts = (parseJson<{ posts: any[] }>(text).posts ?? []).slice(0, data.count);
    if (!posts.length) throw new Error("Nu s-au generat postări.");
    const rows = posts.map(p => ({
      user_id: context.userId, brand_id: c.brand_id, campaign_id: c.id, platform: "both", content_type: "static", status: "draft",
      title: String(p.title ?? "").slice(0, 200), copy: String(p.copy ?? "").slice(0, 3000),
      hashtags: String(p.hashtags ?? "").slice(0, 500), call_to_action: String(p.call_to_action ?? "").slice(0, 200),
      visual_idea: String(p.visual_idea ?? "").slice(0, 500),
    }));
    const { error } = await context.supabase.from("generated_posts").insert(rows);
    if (error) throw new Error(error.message);
    const flagged = rows.filter(r => findBannedWords(`${r.title} ${r.copy}`, ctx.bannedWords).length).length;
    return { count: rows.length, flagged };
  });
