import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Row = z.object({
  title: z.string().max(200).optional(),
  copy: z.string().min(1).max(5000),
  hashtags: z.string().max(1000).optional(),
  platform: z.enum(["instagram", "facebook", "both"]).default("instagram"),
  scheduled_date: z.string().datetime().nullable().optional(),
});

const Input = z.object({
  rows: z.array(Row).min(1).max(100),
});

export const importPostsCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("users_profiles")
      .select("posts_remaining,current_brand_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const remaining = profile?.posts_remaining ?? 0;
    if (remaining < data.rows.length) {
      throw new Error(`Ai doar ${remaining} postări rămase, dar încerci să imporți ${data.rows.length}. Redu numărul sau fă upgrade.`);
    }

    const inserts = data.rows.map((r) => ({
      user_id: context.userId,
      brand_id: profile?.current_brand_id ?? null,
      title: r.title ?? null,
      copy: r.copy,
      hashtags: r.hashtags ?? null,
      platform: r.platform,
      content_type: "static",
      status: r.scheduled_date ? "scheduled" : "draft",
      scheduled_date: r.scheduled_date ?? null,
    }));

    const { error } = await context.supabase.from("generated_posts").insert(inserts);
    if (error) throw new Error(error.message);

    // Scade cota.
    await context.supabase
      .from("users_profiles")
      .update({ posts_remaining: remaining - data.rows.length })
      .eq("user_id", context.userId);

    return { ok: true, count: data.rows.length };
  });
