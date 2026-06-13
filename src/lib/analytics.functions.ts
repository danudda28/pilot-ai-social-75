import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: posts } = await context.supabase
      .from("generated_posts")
      .select("id,status,platform,created_at,published_at,engagement_likes,engagement_comments,engagement_shares,engagement_reach")
      .eq("user_id", context.userId);

    const all = posts ?? [];
    const published = all.filter(p => p.status === "published");
    const totalLikes = published.reduce((s, p) => s + (p.engagement_likes ?? 0), 0);
    const totalComments = published.reduce((s, p) => s + (p.engagement_comments ?? 0), 0);
    const totalShares = published.reduce((s, p) => s + (p.engagement_shares ?? 0), 0);
    const totalReach = published.reduce((s, p) => s + (p.engagement_reach ?? 0), 0);
    const avgEng = published.length > 0 && totalReach > 0
      ? Math.round(((totalLikes + totalComments + totalShares) / totalReach) * 1000) / 10
      : 0;

    const byPlatform: Record<string, number> = {};
    for (const p of all) byPlatform[p.platform] = (byPlatform[p.platform] ?? 0) + 1;

    // Last 14 days
    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = all.filter(p => (p.published_at ?? p.created_at)?.slice(0, 10) === key).length;
      days.push({ date: key, count });
    }

    return {
      totals: { all: all.length, published: published.length, totalLikes, totalComments, totalShares, totalReach, avgEng },
      byPlatform,
      timeline: days,
    };
  });
