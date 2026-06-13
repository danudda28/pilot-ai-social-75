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

async function buildPostText(post: any): Promise<string> {
  return [post.title, post.copy ?? post.short_copy, post.hashtags, post.call_to_action]
    .filter(Boolean).map((s: string) => s.trim()).join("\n\n");
}

async function getSignedImageUrl(imagePath: string | null): Promise<string | undefined> {
  if (!imagePath) return undefined;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .storage.from("post-images")
    .createSignedUrl(imagePath, 60 * 60 * 24 * 7);
  if (error) return undefined;
  return data.signedUrl;
}

const publishInput = z.object({
  postId: z.string().uuid(),
  profileIds: z.array(z.string().regex(/^[0-9a-f-]{36}:(fb|ig)$/i)).min(1),
});

export const publishPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => publishInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: post, error: pErr } = await context.supabase
      .from("generated_posts").select("*").eq("id", data.postId).eq("user_id", context.userId).single();
    if (pErr || !post) throw new Error(pErr?.message ?? "Postare inexistentă.");

    const text = await buildPostText(post);
    const imageUrl = await getSignedImageUrl(post.image_url);

    // Group by connection_id
    const byConn = new Map<string, Set<"fb" | "ig">>();
    for (const id of data.profileIds) {
      const [connId, kind] = id.split(":") as [string, "fb" | "ig"];
      if (!byConn.has(connId)) byConn.set(connId, new Set());
      byConn.get(connId)!.add(kind);
    }

    const { data: conns, error: cErr } = await context.supabase
      .from("meta_connections")
      .select("id,page_id,page_access_token,ig_business_id")
      .in("id", Array.from(byConn.keys()))
      .eq("user_id", context.userId);
    if (cErr) throw new Error(cErr.message);

    const { publishToFacebookPage, publishToInstagram } = await import("./meta.server");
    const results: { target: string; ok: boolean; error?: string; id?: string }[] = [];

    for (const conn of conns) {
      const kinds = byConn.get(conn.id)!;
      if (kinds.has("fb")) {
        try {
          const r = await publishToFacebookPage({
            pageId: conn.page_id,
            pageAccessToken: conn.page_access_token,
            message: text,
            imageUrl,
          });
          results.push({ target: `${conn.id}:fb`, ok: true, id: r.id });
        } catch (e: any) {
          results.push({ target: `${conn.id}:fb`, ok: false, error: e?.message });
        }
      }
      if (kinds.has("ig")) {
        if (!conn.ig_business_id) {
          results.push({ target: `${conn.id}:ig`, ok: false, error: "Nu există cont IG Business asociat." });
        } else if (!imageUrl) {
          results.push({ target: `${conn.id}:ig`, ok: false, error: "Instagram necesită imagine." });
        } else {
          try {
            const r = await publishToInstagram({
              igBusinessId: conn.ig_business_id,
              pageAccessToken: conn.page_access_token,
              imageUrl,
              caption: text,
            });
            results.push({ target: `${conn.id}:ig`, ok: true, id: r.id });
          } catch (e: any) {
            results.push({ target: `${conn.id}:ig`, ok: false, error: e?.message });
          }
        }
      }
    }

    const anySuccess = results.some(r => r.ok);
    if (anySuccess) {
      await context.supabase
        .from("generated_posts")
        .update({ status: "published" })
        .eq("id", data.postId).eq("user_id", context.userId);
    }
    return { results };
  });

/** Marks post as scheduled in DB. The cron worker picks it up at scheduled_date. */
export const schedulePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    postId: z.string().uuid(),
    scheduledDate: z.string(),
    profileIds: z.array(z.string().regex(/^[0-9a-f-]{36}:(fb|ig)$/i)).min(1),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("generated_posts")
      .update({
        status: "scheduled",
        scheduled_date: data.scheduledDate,
        target_profile_ids: data.profileIds,
        last_publish_error: null,
      })
      .eq("id", data.postId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPostAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("generated_posts").select("status").eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return {
      total: data.length,
      published: data.filter(p => p.status === "published").length,
      scheduled: data.filter(p => p.status === "scheduled").length,
      engagement_rate_placeholder: 0,
    };
  });
