/**
 * Social publishing via Buffer API (https://buffer.com/developers/api).
 * Requires BUFFER_ACCESS_TOKEN secret.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const connectSocialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    platform: z.enum(["instagram", "facebook"]),
    account_name: z.string().min(1).max(100),
    buffer_profile_id: z.string().min(1).max(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("connected_accounts")
      .insert({
        user_id: context.userId,
        platform: data.platform,
        account_name: data.account_name,
        account_id: data.buffer_profile_id,
        access_token_placeholder: "buffer",
        status: "connected",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getConnectedAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const disconnectSocialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("connected_accounts").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Listează profilurile Buffer disponibile pentru contul conectat. */
export const listBufferProfilesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { listBufferProfiles } = await import("./buffer.server");
    const profiles = await listBufferProfiles();
    return profiles.map(p => ({
      id: p.id,
      service: p.service,
      username: p.service_username ?? p.formatted_username ?? p.id,
      avatar: p.avatar,
    }));
  });

async function buildPostText(post: any): Promise<string> {
  const parts = [post.title, post.copy ?? post.short_copy, post.hashtags, post.call_to_action]
    .filter(Boolean)
    .map((s: string) => s.trim());
  return parts.join("\n\n");
}

async function getPublicImageUrl(imagePath: string | null): Promise<string | undefined> {
  if (!imagePath) return undefined;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .storage
    .from("post-images")
    .createSignedUrl(imagePath, 60 * 60 * 24 * 7); // 7 zile
  if (error) return undefined;
  return data.signedUrl;
}

export const schedulePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    postId: z.string().uuid(),
    scheduledDate: z.string(),
    profileIds: z.array(z.string()).min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: post, error: pErr } = await context.supabase
      .from("generated_posts").select("*").eq("id", data.postId).eq("user_id", context.userId).single();
    if (pErr || !post) throw new Error(pErr?.message ?? "Postare inexistentă.");

    const text = await buildPostText(post);
    const imageUrl = await getPublicImageUrl(post.image_url);
    const scheduledAt = Math.floor(new Date(data.scheduledDate).getTime() / 1000);

    const { createBufferUpdate } = await import("./buffer.server");
    await createBufferUpdate({ profileIds: data.profileIds, text, scheduledAt, imageUrl });

    const { error } = await context.supabase
      .from("generated_posts")
      .update({ status: "scheduled", scheduled_date: data.scheduledDate })
      .eq("id", data.postId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const publishPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    postId: z.string().uuid(),
    profileIds: z.array(z.string()).min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: post, error: pErr } = await context.supabase
      .from("generated_posts").select("*").eq("id", data.postId).eq("user_id", context.userId).single();
    if (pErr || !post) throw new Error(pErr?.message ?? "Postare inexistentă.");

    const text = await buildPostText(post);
    const imageUrl = await getPublicImageUrl(post.image_url);

    const { createBufferUpdate } = await import("./buffer.server");
    await createBufferUpdate({ profileIds: data.profileIds, text, now: true, imageUrl });

    const { error } = await context.supabase
      .from("generated_posts")
      .update({ status: "published" })
      .eq("id", data.postId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPostAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("generated_posts")
      .select("status")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const total = data.length;
    const published = data.filter(p => p.status === "published").length;
    const scheduled = data.filter(p => p.status === "scheduled").length;
    return { total, published, scheduled, engagement_rate_placeholder: 0 };
  });
