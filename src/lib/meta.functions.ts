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

