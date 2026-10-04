import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function brandFor(sb: any, userId: string) {
  const { resolveBrandId } = await import("./brand-context.server");
  return resolveBrandId(sb, userId);
}

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    status: z.enum(["all", "new", "contacted", "won", "lost"]).default("all"),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const brandId = await brandFor(context.supabase, context.userId);
    if (!brandId) return [];
    let q = context.supabase.from("leads")
      .select("id,customer_name,channel,intent,summary,status,notes,created_at,conversation_id")
      .eq("brand_id", brandId).order("created_at", { ascending: false }).limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["new", "contacted", "won", "lost"]).optional(),
    notes: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: { updated_at: string; status?: "new" | "contacted" | "won" | "lost"; notes?: string } = { updated_at: new Date().toISOString() };
    if (data.status) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;
    const { error } = await context.supabase.from("leads").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message.includes("row-level") ? "Nu ai drept să modifici leaduri." : error.message);
    return { ok: true };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** CSV export of all leads for the active brand. */
export const exportLeadsCsv = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const brandId = await brandFor(context.supabase, context.userId);
    if (!brandId) return { csv: "" };
    const { data: rows, error } = await context.supabase.from("leads")
      .select("customer_name,channel,intent,summary,status,notes,created_at")
      .eq("brand_id", brandId).order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = "Nume,Canal,Intenție,Mesaj,Status,Note,Data";
    const lines = (rows ?? []).map(r =>
      [r.customer_name, r.channel, r.intent, r.summary, r.status, r.notes, new Date(r.created_at).toLocaleString("ro-RO")].map(esc).join(","));
    return { csv: [header, ...lines].join("\n") };
  });
