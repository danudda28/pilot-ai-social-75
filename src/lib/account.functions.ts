import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** GDPR: exportă toate datele utilizatorului ca JSON */
export const exportMyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, brands, members, posts, meta, notifPrefs, notifs, referrals] = await Promise.all([
      supabase.from("users_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("brands").select("*").eq("owner_id", userId),
      supabase.from("brand_members").select("*").eq("user_id", userId),
      supabase.from("generated_posts").select("*").eq("user_id", userId),
      supabase.from("meta_connections").select("id,fb_user_id,fb_user_name,page_id,page_name,ig_business_id,ig_username,created_at").eq("user_id", userId),
      supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("notifications").select("*").eq("user_id", userId),
      supabase.from("referrals").select("*").eq("referrer_id", userId),
    ]);
    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile: profile.data,
      brands: brands.data ?? [],
      brand_memberships: members.data ?? [],
      generated_posts: posts.data ?? [],
      meta_connections: meta.data ?? [],
      notification_preferences: notifPrefs.data,
      notifications: notifs.data ?? [],
      referrals: referrals.data ?? [],
    };
  });

/** GDPR: șterge complet contul utilizatorului */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Datele user-owned vor fi șterse cascadat prin FK ON DELETE CASCADE pe auth.users
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
