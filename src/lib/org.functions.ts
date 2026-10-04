import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ROLES = ["admin", "marketer", "agent", "viewer"] as const;

export const listOrgMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data: mine } = await sb.from("organization_members").select("organization_id, role, organizations(id,name)").eq("user_id", context.userId).order("created_at").limit(1).maybeSingle();
    if (!mine) return { organization: null, myRole: null, members: [] };
    const { data: members } = await sb.from("organization_members").select("id,user_id,role,created_at").eq("organization_id", mine.organization_id).order("created_at");
    // Numele/emailul membrilor: citite server-side doar după ce am verificat apartenența.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const enriched = await Promise.all((members ?? []).map(async (m: any) => {
      const [{ data: prof }, { data: u }] = await Promise.all([
        supabaseAdmin.from("users_profiles").select("full_name").eq("user_id", m.user_id).maybeSingle(),
        supabaseAdmin.auth.admin.getUserById(m.user_id),
      ]);
      return { ...m, full_name: prof?.full_name ?? null, email: u?.user?.email ?? null };
    }));
    return { organization: mine.organizations, myRole: mine.role, members: enriched };
  });

export const updateOrgMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ memberId: z.string().uuid(), role: z.enum(ROLES) }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS permite doar owner/admin și interzice modificarea owner-ului.
    const { data: rows, error } = await (context.supabase as any).from("organization_members").update({ role: data.role }).eq("id", data.memberId).select("id");
    if (error) throw new Error(error.message);
    if (!rows?.length) throw new Error("Nu ai permisiunea să schimbi acest rol.");
    return { ok: true };
  });
