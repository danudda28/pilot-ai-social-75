import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const getMetaAuthUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    const { signState, buildAuthUrl } = await import("./meta.server");
    const redirectUri = `${data.origin}/api/public/auth/meta/callback`;
    const state = signState({ userId: context.userId, origin: data.origin });
    return { url: buildAuthUrl(redirectUri, state) };
  });

export const getMetaConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("meta_connections")
      .select("id,fb_user_name,page_id,page_name,ig_business_id,ig_username,token_expires_at,created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

/** Re-checks each connected page for a linked Instagram Business account. */
export const syncInstagramAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: conns, error } = await context.supabase
      .from("meta_connections")
      .select("id,page_id,page_access_token,ig_business_id")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    const { getPageInstagram } = await import("./meta.server");
    let linked = 0;
    for (const c of conns ?? []) {
      const ig = await getPageInstagram(c.page_id, c.page_access_token);
      if (ig?.id && ig.id !== c.ig_business_id) {
        const { error: uErr } = await context.supabase
          .from("meta_connections")
          .update({ ig_business_id: ig.id, ig_username: ig.username ?? null })
          .eq("id", c.id)
          .eq("user_id", context.userId);
        if (!uErr) linked++;
      } else if (ig?.id) {
        linked++;
      }
    }
    return { linked, total: conns?.length ?? 0 };
  });

export type ConnectionHealth = {
  connection_id: string; page_name: string; ig_username: string | null;
  token_valid: boolean | null; expires_at: string | null; missing_scopes: string[]; instagram_linked: boolean;
  last_checked_at: string | null; last_success_at: string | null; last_failure_at: string | null; last_error: string | null;
  needs_action: boolean;
};

export const getMetaHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConnectionHealth[]> => {
    const [{ data: conns }, { data: health }] = await Promise.all([
      context.supabase.from("meta_connections").select("id,page_name,ig_username,ig_business_id,token_expires_at").eq("user_id", context.userId),
      context.supabase.from("social_connection_health").select("*").eq("user_id", context.userId),
    ]);
    const byId = new Map((health ?? []).map(h => [h.connection_id, h]));
    const soon = Date.now() + 7 * 24 * 3600 * 1000;
    return (conns ?? []).map(c => {
      const h: any = byId.get(c.id) ?? {};
      const expires = h.expires_at ?? c.token_expires_at ?? null;
      const needs = h.token_valid === false || (h.missing_scopes?.length ?? 0) > 0 || (expires ? new Date(expires).getTime() < soon : false);
      return {
        connection_id: c.id, page_name: c.page_name, ig_username: c.ig_username,
        token_valid: h.token_valid ?? null, expires_at: expires, missing_scopes: h.missing_scopes ?? [],
        instagram_linked: h.instagram_linked ?? !!c.ig_business_id,
        last_checked_at: h.last_checked_at ?? null, last_success_at: h.last_success_at ?? null,
        last_failure_at: h.last_failure_at ?? null, last_error: h.last_error ?? null, needs_action: needs,
      };
    });
  });

export const checkMetaHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runHealthChecks } = await import("./meta-health.server");
    return runHealthChecks(supabaseAdmin, { userId: context.userId });
  });

export const disconnectMetaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("meta_connections")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

