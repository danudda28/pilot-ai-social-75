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
