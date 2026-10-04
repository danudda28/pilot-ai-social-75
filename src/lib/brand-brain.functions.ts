import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const LIST_TABLES = ["brand_locations", "products_services", "business_policies", "brand_faqs", "knowledge_sources"] as const;
type ListTable = (typeof LIST_TABLES)[number];

async function currentBrandId(supabase: any, userId: string, brandId?: string) {
  if (brandId) return brandId;
  const { data } = await supabase.from("users_profiles").select("current_brand_id").eq("user_id", userId).maybeSingle();
  if (data?.current_brand_id) return data.current_brand_id as string;
  const { data: b } = await supabase.from("brands").select("id").order("created_at").limit(1).maybeSingle();
  if (!b) throw new Error("Nu ai niciun brand.");
  return b.id as string;
}

function completeness(brand: any, voice: any, lists: Record<string, any[]>) {
  const checks: { key: string; label: string; ok: boolean }[] = [
    { key: "name", label: "Numele afacerii", ok: !!brand?.name && brand.name !== "Brandul meu" },
    { key: "category", label: "Domeniul de activitate", ok: !!brand?.category },
    { key: "short_description", label: "Descriere scurtă", ok: !!brand?.short_description },
    { key: "target_audience", label: "Publicul țintă", ok: !!brand?.target_audience },
    { key: "differentiators", label: "Ce te face diferit", ok: !!brand?.differentiators },
    { key: "contact", label: "Telefon sau email de contact", ok: !!(brand?.phone || brand?.email) },
    { key: "locations", label: "Locație sau zonă deservită", ok: (lists.brand_locations?.length ?? 0) > 0 || brand?.primary_goal === "online" },
    { key: "products", label: "Cel puțin un produs/serviciu", ok: (lists.products_services?.length ?? 0) > 0 },
    { key: "faqs", label: "Întrebări frecvente", ok: (lists.brand_faqs?.length ?? 0) > 0 },
    { key: "policies", label: "Politici (livrare, anulare, retur)", ok: (lists.business_policies?.length ?? 0) > 0 },
    { key: "voice", label: "Tonul și vocea brandului", ok: !!voice },
  ];
  const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
  return { score, missing: checks.filter(c => !c.ok) };
}

export const getBrandBrain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brandId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const brandId = await currentBrandId(supabase, userId, data.brandId);
    const [brand, voice, ...lists] = await Promise.all([
      supabase.from("brands").select("*").eq("id", brandId).maybeSingle(),
      supabase.from("brand_voice_rules").select("*").eq("brand_id", brandId).maybeSingle(),
      ...LIST_TABLES.map(t => supabase.from(t).select("*").eq("brand_id", brandId).order("created_at")),
    ]);
    if (!brand.data) throw new Error("Brand inexistent sau fără acces.");
    const listMap: Record<string, any[]> = {};
    LIST_TABLES.forEach((t, i) => { listMap[t] = (lists[i] as any).data ?? []; });
    let role: string | null = null;
    if (brand.data.organization_id) {
      const { data: m } = await supabase.from("organization_members").select("role")
        .eq("organization_id", brand.data.organization_id).eq("user_id", userId).maybeSingle();
      role = m?.role ?? null;
    }
    return { brand: brand.data, voice: voice.data, lists: listMap, role, completeness: completeness(brand.data, voice.data, listMap) };
  });

const profileSchema = z.object({
  brandId: z.string().uuid(),
  fields: z.object({
    name: z.string().min(2).max(120),
    legal_name: z.string().max(200).nullable(),
    short_description: z.string().max(300).nullable(),
    long_description: z.string().max(3000).nullable(),
    category: z.string().max(100).nullable(),
    subcategory: z.string().max(100).nullable(),
    target_audience: z.string().max(1000).nullable(),
    differentiators: z.string().max(1500).nullable(),
    brand_values: z.string().max(1000).nullable(),
    website_url: z.string().max(300).nullable(),
    primary_goal: z.string().max(40).nullable(),
    city: z.string().max(100).nullable(),
    country: z.string().max(100).nullable(),
    phone: z.string().max(40).nullable(),
    email: z.string().max(200).nullable(),
    whatsapp: z.string().max(40).nullable(),
    booking_url: z.string().max(300).nullable(),
    timezone: z.string().max(60),
    currency: z.string().max(10),
    onboarding_step: z.number().int().min(0).max(10),
  }).partial(),
});

export const updateBrandProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("brands").update(data.fields as any).eq("id", data.brandId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const voiceSchema = z.object({
  brandId: z.string().uuid(),
  tone: z.string().max(40),
  address_form: z.enum(["tu", "dumneavoastra"]),
  emoji_level: z.enum(["fara", "putine", "moderate"]),
  text_length: z.enum(["scurt", "mediu", "lung"]),
  preferred_phrases: z.array(z.string().max(200)).max(50),
  banned_words: z.array(z.string().max(100)).max(100),
  example_posts: z.array(z.string().max(3000)).max(10),
  example_replies: z.array(z.string().max(2000)).max(10),
  colors: z.array(z.string().max(20)).max(10),
  fonts: z.array(z.string().max(60)).max(5),
});

export const saveVoiceRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => voiceSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { brandId, ...rest } = data;
    const { error } = await context.supabase.from("brand_voice_rules")
      .upsert({ brand_id: brandId, organization_id: "00000000-0000-0000-0000-000000000000", ...rest } as any, { onConflict: "brand_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const itemSchemas: Record<ListTable, z.ZodTypeAny> = {
  brand_locations: z.object({
    name: z.string().min(1).max(120), address: z.string().max(300).nullable().optional(),
    city: z.string().max(100).nullable().optional(), phone: z.string().max(40).nullable().optional(),
    email: z.string().max(200).nullable().optional(), opening_hours: z.record(z.string(), z.string().max(60)).optional(),
    service_area: z.string().max(300).nullable().optional(), booking_url: z.string().max(300).nullable().optional(),
    is_primary: z.boolean().optional(),
  }),
  products_services: z.object({
    name: z.string().min(1).max(160), description: z.string().max(1000).nullable().optional(),
    price_type: z.enum(["fixed", "from", "range", "on_request", "unknown"]).optional(),
    price_from: z.number().nonnegative().nullable().optional(), price_to: z.number().nonnegative().nullable().optional(),
    duration: z.string().max(60).nullable().optional(), url: z.string().max(300).nullable().optional(),
  }),
  business_policies: z.object({
    kind: z.string().max(40).optional(), title: z.string().min(1).max(160), content: z.string().min(1).max(3000),
  }),
  brand_faqs: z.object({ question: z.string().min(3).max(300), answer: z.string().min(1).max(2000) }),
  knowledge_sources: z.object({
    kind: z.enum(["manual", "website", "document"]).optional(), title: z.string().min(1).max(200),
    url: z.string().max(500).nullable().optional(), content: z.string().max(20000).nullable().optional(),
    status: z.enum(["draft", "confirmed", "archived"]).optional(),
  }),
};

export const saveBrainItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const base = z.object({ table: z.enum(LIST_TABLES), brandId: z.string().uuid(), id: z.string().uuid().optional(), item: z.unknown() }).parse(d);
    return { ...base, item: itemSchemas[base.table].parse(base.item) as Record<string, unknown> };
  })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (data.id) {
      const { error } = await sb.from(data.table).update(data.item).eq("id", data.id).eq("brand_id", data.brandId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const extra = data.table === "knowledge_sources" ? { created_by: context.userId } : {};
    const { data: row, error } = await sb.from(data.table)
      .insert({ ...data.item, ...extra, brand_id: data.brandId, organization_id: "00000000-0000-0000-0000-000000000000" })
      .select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteBrainItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ table: z.enum(LIST_TABLES), id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from(data.table).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
