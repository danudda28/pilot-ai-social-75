/**
 * Direct Meta Graph API publishing (Facebook Pages + Instagram Business).
 * Uses connections stored in meta_connections.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Returns publishable targets (one FB + optional IG per connected page). */
export const getConnectedAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("meta_connections")
      .select("id,page_id,page_name,ig_business_id,ig_username")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    type Target = { target_id: string; platform: "facebook" | "instagram"; account_name: string; connection_id: string };
    const targets: Target[] = [];
    for (const c of data) {
      targets.push({
        target_id: `${c.id}:fb`,
        platform: "facebook",
        account_name: c.page_name,
        connection_id: c.id,
      });
      if (c.ig_business_id) {
        targets.push({
          target_id: `${c.id}:ig`,
          platform: "instagram",
          account_name: c.ig_username ?? "Instagram",
          connection_id: c.id,
        });
      }
    }
    return targets;
  });

const targetSchema = z.array(z.string().regex(/^[0-9a-f-]{36}:(fb|ig)$/i)).min(1);

/** Verifies the caller owns the post and every connection in targets (RLS as user). */
async function verifyOwnership(sb: any, userId: string, postId: string, targets: string[]) {
  const { data: post, error } = await sb.from("generated_posts").select("id,user_id,brand_id").eq("id", postId).eq("user_id", userId).maybeSingle();
  if (error || !post) throw new Error("Postare inexistentă.");
  const connIds = Array.from(new Set(targets.map(t => t.split(":")[0])));
  const { data: conns } = await sb.from("meta_connections").select("id").in("id", connIds).eq("user_id", userId);
  if ((conns?.length ?? 0) !== connIds.length) throw new Error("Unul dintre conturile selectate nu îți aparține sau a fost deconectat.");
  return post as { id: string; user_id: string; brand_id: string | null };
}

export const publishPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid(), profileIds: targetSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const post = await verifyOwnership(context.supabase, context.userId, data.postId, data.profileIds);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { enqueueJobs, processJobs } = await import("./publishing-queue.server");
    const now = new Date().toISOString();
    await supabaseAdmin.from("generated_posts").update({ target_profile_ids: data.profileIds, status: "scheduled", scheduled_date: now, last_publish_error: null }).eq("id", post.id);
    await enqueueJobs(supabaseAdmin, post, data.profileIds, now);
    const results = await processJobs(supabaseAdmin, { postId: post.id });
    return { results: results.map(r => ({ target: r.target, ok: r.ok, error: r.error, id: r.id })) };
  });

/** Schedules a post: creates publishing jobs that the cron worker runs at scheduledDate. */
export const schedulePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid(), scheduledDate: z.string(), profileIds: targetSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const when = new Date(data.scheduledDate);
    if (isNaN(when.getTime())) throw new Error("Dată invalidă.");
    const post = await verifyOwnership(context.supabase, context.userId, data.postId, data.profileIds);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { enqueueJobs } = await import("./publishing-queue.server");
    const { error } = await supabaseAdmin.from("generated_posts").update({
      status: "scheduled", scheduled_date: when.toISOString(), target_profile_ids: data.profileIds, last_publish_error: null,
    }).eq("id", post.id);
    if (error) throw new Error(error.message);
    await enqueueJobs(supabaseAdmin, post, data.profileIds, when.toISOString());
    return { ok: true };
  });

/** Publishing job states for the caller's posts (optionally one post). */
export const getPublishingJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("publishing_jobs").select("id,post_id,target,kind,status,attempts,max_attempts,next_attempt_at,last_error,published_at,run_at").eq("user_id", context.userId).neq("status", "cancelled").order("run_at", { ascending: false }).limit(200);
    if (data.postId) q = q.eq("post_id", data.postId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPostAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("generated_posts").select("status").eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return {
      total: data.length,
      published: data.filter((p: any) => p.status === "published").length,
      scheduled: data.filter((p: any) => p.status === "scheduled").length,
      engagement_rate_placeholder: 0,
    };
  });
