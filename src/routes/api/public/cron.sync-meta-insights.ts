/**
 * Cron worker: pull engagement metrics for posts published in the last 14 days
 * from Meta Graph (FB Page Insights + IG Media Insights). Run daily.
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
          const { data: posts, error } = await supabaseAdmin
            .from("generated_posts")
            .select("id,user_id,target_profile_ids,published_at")
            .eq("status", "published")
            .gte("published_at", since);
          if (error) throw new Error(error.message);

          let updated = 0;
          for (const post of posts ?? []) {
            const targets = (post.target_profile_ids ?? []) as string[];
            if (targets.length === 0) continue;

            const connIds = Array.from(new Set(targets.map(t => t.split(":")[0])));
            const { data: conns } = await supabaseAdmin
              .from("meta_connections")
              .select("id,page_id,page_access_token,ig_business_id")
              .in("id", connIds)
              .eq("user_id", post.user_id);

            let likes = 0, comments = 0, shares = 0, reach = 0;
            const byId = new Map((conns ?? []).map(c => [c.id, c]));

            for (const t of targets) {
              const [connId, kind] = t.split(":") as [string, "fb" | "ig"];
              const c = byId.get(connId);
              if (!c) continue;
              try {
                const m = await fetchPostInsights({
                  pageId: c.page_id,
                  pageAccessToken: c.page_access_token,
                  postId: post.id,
                  kind,
                });
                likes += m.likes;
                comments += m.comments;
                shares += m.shares;
                reach += m.reach;
              } catch (e) {
                console.warn(`[insights] ${post.id}/${t}:`, e);
              }
            }

            await supabaseAdmin.from("generated_posts").update({
              engagement_likes: likes,
              engagement_comments: comments,
              engagement_shares: shares,
              engagement_reach: reach,
              engagement_fetched_at: new Date().toISOString(),
            }).eq("id", post.id);
            updated++;
          }
          return Response.json({ checked: posts?.length ?? 0, updated });
        } catch (e: any) {
          console.error("[cron sync-meta-insights]", e);
          return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
        }
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run" }),
    },
  },
});
