import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listMyBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: memberships } = await context.supabase
      .from("brand_members")
      .select("role, brands(id, name, description, business_type, domain, owner_id, created_at)")
      .eq("user_id", context.userId);
    return (memberships ?? []).map((m: any) => ({ ...m.brands, role: m.role }));
  });

export const createBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    name: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    business_type: z.string().max(100).optional(),
    domain: z.string().max(100).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: org } = await context.supabase.from("organization_members")
      .select("organization_id").eq("user_id", context.userId).in("role", ["owner", "admin"])
      .order("created_at").limit(1).maybeSingle();
    const { data: brand, error } = await context.supabase
      .from("brands")
      .insert({ ...data, owner_id: context.userId, organization_id: org?.organization_id ?? null })
      .select().single();
    if (error) throw new Error(error.message);
    await context.supabase.from("brand_members").insert({ brand_id: brand.id, user_id: context.userId, role: "owner" });
    return brand;
  });

export const updateBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    business_type: z.string().max(100).optional(),
    domain: z.string().max(100).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...fields } = data;
    const { error } = await context.supabase.from("brands").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const switchBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brandId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: member } = await context.supabase
      .from("brand_members").select("id").eq("brand_id", data.brandId).eq("user_id", context.userId).maybeSingle();
    if (!member) throw new Error("Nu ai acces la acest brand.");
    await context.supabase.from("users_profiles").update({ current_brand_id: data.brandId }).eq("user_id", context.userId);
    return { ok: true };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    brandId: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(["editor", "viewer"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: brand } = await context.supabase.from("brands").select("owner_id,name").eq("id", data.brandId).maybeSingle();
    if (!brand || brand.owner_id !== context.userId) throw new Error("Doar owner-ul poate invita.");
    const { data: inv, error } = await context.supabase.from("brand_invitations").insert({
      brand_id: data.brandId, email: data.email.toLowerCase(), role: data.role, invited_by: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    // Email send stub
    const link = `${process.env.PUBLIC_APP_URL ?? ""}/invitatie/${inv.token}`;
    await context.supabase.from("email_log").insert({
      user_id: context.userId, template: "brand_invitation", recipient: data.email,
      subject: `Invitație la ${brand.name}`, status: "pending", metadata: { link, role: data.role }
    });
    return { ok: true, inviteLink: link };
  });

export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brandId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: members } = await context.supabase.from("brand_members")
      .select("id,user_id,role,created_at").eq("brand_id", data.brandId);
    const { data: invs } = await context.supabase.from("brand_invitations")
      .select("id,email,role,token,accepted_at,expires_at,created_at").eq("brand_id", data.brandId).is("accepted_at", null);
    return { members: members ?? [], invitations: invs ?? [] };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: member } = await context.supabase.from("brand_members").select("brand_id,user_id").eq("id", data.memberId).maybeSingle();
    if (!member) throw new Error("Membru inexistent.");
    const { data: brand } = await context.supabase.from("brands").select("owner_id").eq("id", member.brand_id).maybeSingle();
    if (!brand || brand.owner_id !== context.userId) throw new Error("Nu ai permisiune.");
    if (member.user_id === context.userId) throw new Error("Nu te poți elimina pe tine.");
    await context.supabase.from("brand_members").delete().eq("id", data.memberId);
    return { ok: true };
  });
