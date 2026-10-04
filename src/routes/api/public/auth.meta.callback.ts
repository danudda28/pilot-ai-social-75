import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/auth/meta/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDesc = url.searchParams.get("error_description");

        if (error) {
          return htmlRedirect(`/dashboard/integrari?meta_error=${encodeURIComponent(errorDesc ?? error)}`);
        }
        if (!code || !state) {
          return htmlRedirect("/dashboard/integrari?meta_error=missing_code_or_state");
        }

        try {
          const {
            verifyState, exchangeCodeForToken, exchangeForLongLivedToken, getMeAndPages,
          } = await import("@/lib/meta.server");
          const { userId, origin } = verifyState(state);
          const redirectUri = `${origin}/api/public/auth/meta/callback`;

          const shortToken = await exchangeCodeForToken(code, redirectUri);
          const { token: longToken, expiresIn } = await exchangeForLongLivedToken(shortToken);
          const { user, pages } = await getMeAndPages(longToken);

          if (pages.length === 0) {
            return htmlRedirect(`${origin}/dashboard/integrari?meta_error=no_pages`);
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

          const rows = pages.map((p) => ({
            user_id: userId,
            fb_user_id: user.id,
            fb_user_name: user.name,
            page_id: p.id,
            page_name: p.name,
            page_access_token: p.access_token,
            ig_business_id: p.instagram_business_account?.id ?? null,
            ig_username: p.instagram_business_account?.username ?? null,
            token_expires_at: expiresAt,
          }));

          const { error: upErr } = await supabaseAdmin
            .from("meta_connections")
            .upsert(rows, { onConflict: "user_id,page_id" });
          if (upErr) throw new Error(upErr.message);

          // Subscribe each page to messaging/comment webhooks (best effort; needs pages_manage_metadata).
          const { subscribePageToWebhooks } = await import("@/lib/meta.server");
          await Promise.all(pages.map(p => subscribePageToWebhooks(p.id, p.access_token).catch(e => console.warn("[meta subscribe]", p.id, e?.message))));

          return htmlRedirect(`${origin}/dashboard/integrari?meta_connected=${pages.length}`);
        } catch (e: any) {
          console.error("[meta callback]", e);
          return htmlRedirect(`/dashboard/integrari?meta_error=${encodeURIComponent(e?.message ?? "unknown")}`);
        }
      },
    },
  },
});

function htmlRedirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location } });
}
