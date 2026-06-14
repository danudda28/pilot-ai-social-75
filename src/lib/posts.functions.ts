import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const UpdateInput = z.object({
  postId: z.string().uuid(),
  title: z.string().max(200).optional(),
  copy: z.string().max(5000).optional(),
  short_copy: z.string().max(500).optional(),
  hashtags: z.string().max(1000).optional(),
  call_to_action: z.string().max(200).optional(),
});

export const updatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { postId, ...fields } = data;
    const { error } = await context.supabase
      .from("generated_posts")
      .update(fields)
      .eq("id", postId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RescheduleInput = z.object({
  postId: z.string().uuid(),
  scheduledDate: z.string().datetime(),
});

export const reschedulePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RescheduleInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("generated_posts")
      .update({ scheduled_date: data.scheduledDate, status: "scheduled" })
      .eq("id", data.postId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setApprovalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      postId: z.string().uuid(),
      status: z.enum(["pending", "approved", "rejected", "auto"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("generated_posts")
      .update({
        approval_status: data.status,
        approved_by: data.status === "approved" ? context.userId : null,
        approved_at: data.status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAsWinner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ postId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: post, error: pErr } = await context.supabase
      .from("generated_posts")
      .select("variant_group")
      .eq("id", data.postId)
      .maybeSingle();
    if (pErr || !post) throw new Error("Postare inexistentă.");
    if (!post.variant_group) throw new Error("Această postare nu face parte dintr-un test A/B.");

    // Clear winners in group, then set this one
    await context.supabase
      .from("generated_posts")
      .update({ is_winner: false })
      .eq("variant_group", post.variant_group);
    const { error } = await context.supabase
      .from("generated_posts")
      .update({ is_winner: true })
      .eq("id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const applyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().min(4).max(32) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const code = data.code.trim().toUpperCase();
    // Find referrer
    const { data: referrer, error: rErr } = await context.supabase
      .from("users_profiles")
      .select("user_id,referral_code")
      .eq("referral_code", code)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!referrer) throw new Error("Cod referral invalid.");
    if (referrer.user_id === context.userId) throw new Error("Nu te poți referi singur.");

    // Check if user already used a referral
    const { data: me } = await context.supabase
      .from("users_profiles")
      .select("referred_by,posts_remaining")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (me?.referred_by) throw new Error("Ai folosit deja un cod referral.");

    // Apply: bonus 5 postări pentru noul user, înregistrare referral pentru referrer
    const bonus = 5;
    const newRemaining = (me?.posts_remaining ?? 3) + bonus;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("users_profiles").update({
      referred_by: referrer.user_id,
      posts_remaining: newRemaining,
    }).eq("user_id", context.userId);

    await supabaseAdmin.from("referrals").insert({
      referrer_id: referrer.user_id,
      referred_user_id: context.userId,
      code,
      reward_amount: bonus,
      rewarded: false,
    });

    return { ok: true, bonus };
  });
