import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Webhooks de ieșire către CRM: lead nou, răspuns automat trimis. */

export const getBrandWebhook = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveBrandId } = await import("./brand-context.server");
    const brandId = await resolveBrandId(context.supabase, context.userId);
    if (!brandId) return { webhook: null };
    const { data } = await context.supabase
      .from("brand_webhooks")
      .select("id,url,secret,events,active,created_at")
      .eq("brand_id", brandId)
      .maybeSingle();
    return { webhook: data ?? null };
  });

const SaveInput = z.object({
  url: z.string().url("Adresa trebuie să fie un URL valid (https://...)").max(500),
  events: z.array(z.enum(["lead.created", "reply.auto_sent"])).min(1),
  active: z.boolean(),
});

export const saveBrandWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!data.url.startsWith("https://")) throw new Error("Webhook-ul trebuie să folosească HTTPS.");
    const { resolveBrandId } = await import("./brand-context.server");
    const brandId = await resolveBrandId(context.supabase, context.userId);
    if (!brandId) throw new Error("Nu ai un brand configurat.");
    const { data: existing } = await context.supabase
      .from("brand_webhooks").select("id,secret").eq("brand_id", brandId).maybeSingle();
    const secret = existing?.secret ?? crypto.randomUUID().replace(/-/g, "");
    const payload = { brand_id: brandId, url: data.url, secret, events: data.events, active: data.active, updated_at: new Date().toISOString() };
    const { error } = existing
      ? await context.supabase.from("brand_webhooks").update(payload).eq("id", existing.id)
      : await context.supabase.from("brand_webhooks").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true, secret };
  });

export const deleteBrandWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveBrandId } = await import("./brand-context.server");
    const brandId = await resolveBrandId(context.supabase, context.userId);
    if (!brandId) return { ok: true };
    const { error } = await context.supabase.from("brand_webhooks").delete().eq("brand_id", brandId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testBrandWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveBrandId } = await import("./brand-context.server");
    const brandId = await resolveBrandId(context.supabase, context.userId);
    if (!brandId) throw new Error("Nu ai un brand configurat.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fireBrandWebhooks } = await import("./observability.server");
    await fireBrandWebhooks(supabaseAdmin, brandId, "lead.created", {
      test: true, customer_name: "Test CRM", intent: "programare",
      summary: "Mesaj de test din Social Spark — integrarea funcționează.",
    });
    return { ok: true };
  });
