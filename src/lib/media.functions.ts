import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listMyMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.storage
      .from("post-images")
      .list(context.userId, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error(error.message);

    const items = await Promise.all(
      (data ?? [])
        .filter((f) => f.name && !f.name.endsWith("/"))
        .map(async (f) => {
          const path = `${context.userId}/${f.name}`;
          const { data: signed } = await supabaseAdmin.storage
            .from("post-images")
            .createSignedUrl(path, 60 * 60 * 24 * 7);
          return {
            path,
            name: f.name,
            size: (f.metadata as { size?: number } | null)?.size ?? 0,
            createdAt: f.created_at ?? null,
            url: signed?.signedUrl ?? null,
          };
        }),
    );
    return { items };
  });

export const deleteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`)) throw new Error("Acces interzis.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from("post-images").remove([data.path]);
    if (error) throw new Error(error.message);
    // Detach from any posts referencing it
    await context.supabase
      .from("generated_posts")
      .update({ image_url: null })
      .eq("user_id", context.userId)
      .eq("image_url", data.path);
    return { ok: true };
  });

export const attachMediaToPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ postId: z.string().uuid(), path: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`)) throw new Error("Acces interzis.");
    const { error } = await context.supabase
      .from("generated_posts")
      .update({ image_url: data.path })
      .eq("id", data.postId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
