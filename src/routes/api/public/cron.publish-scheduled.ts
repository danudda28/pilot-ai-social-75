/**
 * Cron worker (every minute): converts legacy scheduled posts into publishing jobs,
 * then processes due jobs with retries/backoff. Idempotent per (post, target).
 */
import { createFileRoute } from "@tanstack/react-router";
import { assertCronAuth } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/cron/publish-scheduled")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = assertCronAuth(request);
        if (denied) return denied;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { enqueueJobs, processJobs } = await import("@/lib/publishing-queue.server");
          const nowIso = new Date().toISOString();

          // Legacy: scheduled posts due now that have no jobs yet.
          const { data: due } = await supabaseAdmin
            .from("generated_posts")
            .select("id,user_id,brand_id,target_profile_ids,scheduled_date")
            .eq("status", "scheduled").lte("scheduled_date", nowIso).limit(50);
          let enqueued = 0;
          for (const post of due ?? []) {
            const { count } = await supabaseAdmin.from("publishing_jobs").select("id", { count: "exact", head: true }).eq("post_id", post.id);
            if ((count ?? 0) > 0) continue;
            const targets = (post.target_profile_ids ?? []) as string[];
            if (!targets.length) {
              await supabaseAdmin.from("generated_posts").update({ status: "failed", last_publish_error: "Nu sunt conturi selectate." }).eq("id", post.id);
              continue;
            }
            await enqueueJobs(supabaseAdmin, post, targets, post.scheduled_date ?? nowIso);
            enqueued++;
          }

          // Recover jobs stuck in processing > 10 min.
          await supabaseAdmin.from("publishing_jobs").update({ status: "pending" })
            .eq("status", "processing").lt("updated_at", new Date(Date.now() - 10 * 60000).toISOString());

          const results = await processJobs(supabaseAdmin, { limit: 25 });
          return Response.json({ enqueued, processed: results.length, ok: results.filter(r => r.ok).length });
        } catch (e: any) {
          console.error("[cron publish-scheduled]", e);
          return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run worker" }),
    },
  },
});
