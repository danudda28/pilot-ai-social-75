/**
 * Social publishing stubs. Wire to Ayrshare / Publer / Buffer once
 * SOCIAL_PUBLISHING_API_KEY and SOCIAL_PUBLISHING_API_URL are configured.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const connectSocialAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    platform: z.enum(["instagram", "facebook"]),
    account_name: z.string().min(1).max(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const apiUrl = process.env.SOCIAL_PUBLISHING_API_URL;
    const apiKey = process.env.SOCIAL_PUBLISHING_API_KEY;
    // TODO: real OAuth/connect call to apiUrl with apiKey.
    const placeholder = `placeholder_token_${Date.now()}`;
    const { data: row, error } = await context.supabase
      .from("connected_accounts")
      .insert({
        user_id: context.userId,
        platform: data.platform,
        account_name: data.account_name,
        access_token_placeholder: placeholder,
        status: apiUrl && apiKey ? "connected" : "pending_api_key",
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

export const schedulePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    postId: z.string().uuid(),
    scheduledDate: z.string(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // TODO: call publishing API to schedule with apiUrl + apiKey.
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
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // TODO: call publishing API to publish now.
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
    // TODO: call publishing API for real analytics.
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
