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
