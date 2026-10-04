import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const checkAmAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [users, posts, brands, contact] = await Promise.all([
      supabaseAdmin.from("users_profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("generated_posts").select("id,status", { count: "exact" }),
      supabaseAdmin.from("brands").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("contact_messages").select("id", { count: "exact", head: true }),
    ]);
    const postsByStatus: Record<string, number> = {};
    (posts.data ?? []).forEach((p: any) => {
      postsByStatus[p.status] = (postsByStatus[p.status] || 0) + 1;
    });
    return {
      users: users.count ?? 0,
      brands: brands.count ?? 0,
      contactMessages: contact.count ?? 0,
      postsTotal: posts.count ?? 0,
      postsByStatus,
    };
  });

export const adminContactMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { messages: data ?? [] };
  });

/** Faza 5: monitorizare globală — joburi de publicare, erori recente, utilizare AI + cost estimat. */
export const adminMonitoring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { estimateCostUsd } = await import("./observability.server");
    const since7d = new Date(Date.now() - 7 * 86400000).toISOString();
    const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
    const [jobs, errors, usage] = await Promise.all([
      supabaseAdmin.from("publishing_jobs").select("status,last_error,updated_at").gte("created_at", since7d),
      supabaseAdmin.from("error_log").select("id,source,message,context,created_at").order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("ai_usage_log").select("feature,model,tokens_in,tokens_out").gte("created_at", since30d),
    ]);
    const jobsByStatus: Record<string, number> = {};
    (jobs.data ?? []).forEach((j: any) => { jobsByStatus[j.status] = (jobsByStatus[j.status] || 0) + 1; });
    const usageByFeature: Record<string, { calls: number; tokensIn: number; tokensOut: number; costUsd: number }> = {};
    let totalCost = 0;
    (usage.data ?? []).forEach((u: any) => {
      const f = usageByFeature[u.feature] ??= { calls: 0, tokensIn: 0, tokensOut: 0, costUsd: 0 };
      f.calls += 1; f.tokensIn += u.tokens_in ?? 0; f.tokensOut += u.tokens_out ?? 0;
      const c = estimateCostUsd(u.model, u.tokens_in ?? 0, u.tokens_out ?? 0);
      f.costUsd += c; totalCost += c;
    });
    return {
      jobsByStatus,
      jobsTotal7d: (jobs.data ?? []).length,
      errors: errors.data ?? [],
      usageByFeature,
      aiCalls30d: (usage.data ?? []).length,
      aiCost30dUsd: Math.round(totalCost * 100) / 100,
    };
  });

/** Reîncearcă toate joburile de publicare eșuate (admin). */
export const adminRetryFailedJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from("publishing_jobs")
      .update({ status: "pending", attempts: 0, next_attempt_at: now, last_error: null })
      .eq("status", "failed").select("id,post_id");
    if (error) throw new Error(error.message);
    const { syncPostStatus } = await import("./publishing-queue.server");
    for (const postId of new Set((data ?? []).map((j: any) => j.post_id))) {
      await syncPostStatus(supabaseAdmin, postId as string);
    }
    return { retried: data?.length ?? 0 };
  });

export const adminRecentUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("users_profiles")
      .select("user_id,full_name,company_name,subscription_plan,subscription_status,posts_remaining,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { users: data ?? [] };
  });
