/**
 * Cron worker (daily): pulls real metrics for jobs published in the last 14 days,
 * using the Meta object id stored on the publishing job. No estimated values.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/sync-meta-insights")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { fetchPostInsights } = await import("@/lib/meta.server");
          const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
          const { data: jobs, error } = await supabaseAdmin
            .from("publishing_jobs")
            .select("post_id,kind,external_id,connection_id,user_id")
            .eq("status", "published").not("external_id", "is", null).gte("published_at", since);
          if (error) throw new Error(error.message);

          const connIds = Array.from(new Set((jobs ?? []).map(j => j.connection_id).filter(Boolean))) as string[];
          const { data: conns } = connIds.length
            ? await supabaseAdmin.from("meta_connections").select("id,page_access_token").in("id", connIds)
            : { data: [] as { id: string; page_access_token: string }[] };
          const tokens = new Map((conns ?? []).map(c => [c.id, c.page_access_token]));

          const totals = new Map<string, { likes: number; comments: number; shares: number; reach: number }>();
          for (const j of jobs ?? []) {
            const token = j.connection_id ? tokens.get(j.connection_id) : undefined;
            if (!token || !j.external_id) continue;
            const m = await fetchPostInsights({ pageAccessToken: token, externalId: j.external_id, kind: j.kind as "fb" | "ig" });
            if (!m) continue;
            const t = totals.get(j.post_id) ?? { likes: 0, comments: 0, shares: 0, reach: 0 };
            t.likes += m.likes; t.comments += m.comments; t.shares += m.shares; t.reach += m.reach;
            totals.set(j.post_id, t);
          }
          for (const [postId, t] of totals) {
            await supabaseAdmin.from("generated_posts").update({
              engagement_likes: t.likes, engagement_comments: t.comments, engagement_shares: t.shares,
              engagement_reach: t.reach, engagement_fetched_at: new Date().toISOString(),
            }).eq("id", postId);
          }
          return Response.json({ checked: jobs?.length ?? 0, updated: totals.size });
        } catch (e: any) {
          console.error("[cron sync-meta-insights]", e);
          return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
        }
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run" }),
    },
  },
});
