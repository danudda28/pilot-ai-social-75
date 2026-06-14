/**
 * Cron worker: reînnoiește token-urile Meta care expiră în <14 zile.
 * Apelat zilnic din pg_cron.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/refresh-meta-tokens")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { exchangeForLongLivedToken } = await import("@/lib/meta.server");

          const threshold = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
          const { data: conns, error } = await supabaseAdmin
            .from("meta_connections")
            .select("id,user_access_token,token_expires_at,user_token_expires_at")
            .lte("token_expires_at", threshold)
            .not("user_access_token", "is", null);
          if (error) throw new Error(error.message);

          let refreshed = 0;
          const failures: Array<{ id: string; error: string }> = [];
          for (const c of conns ?? []) {
            try {
              if (!c.user_access_token) continue;
              const { token, expiresIn } = await exchangeForLongLivedToken(c.user_access_token);
              const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
              await supabaseAdmin.from("meta_connections").update({
                user_access_token: token,
                user_token_expires_at: expiresAt,
                token_expires_at: expiresAt,
                last_refreshed_at: new Date().toISOString(),
              }).eq("id", c.id);
              refreshed++;
            } catch (e: any) {
              failures.push({ id: c.id, error: e?.message ?? "unknown" });
            }
          }
          return Response.json({ checked: conns?.length ?? 0, refreshed, failures });
        } catch (e: any) {
          console.error("[cron refresh-meta-tokens]", e);
          return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
        }
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run" }),
    },
  },
});
