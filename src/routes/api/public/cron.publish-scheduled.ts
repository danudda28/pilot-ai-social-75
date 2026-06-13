/**
 * Cron worker: publică postările cu status='scheduled' și scheduled_date <= now().
 * Apelat din pg_cron la fiecare minut. Autentificare prin apikey (anon) standard Supabase.
 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/cron/publish-scheduled")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { publishToFacebookPage, publishToInstagram } = await import("@/lib/meta.server");

          const nowIso = new Date().toISOString();
          const { data: due, error: dueErr } = await supabaseAdmin
            .from("generated_posts")
            .select("id,user_id,title,copy,short_copy,hashtags,call_to_action,image_url,target_profile_ids")
            .eq("status", "scheduled")
            .lte("scheduled_date", nowIso)
            .limit(20);
          if (dueErr) throw new Error(dueErr.message);

          const summary: Array<{ post_id: string; ok: number; fail: number; errors: string[] }> = [];

          for (const post of due ?? []) {
            const targets = (post.target_profile_ids ?? []) as string[];
            if (targets.length === 0) {
              await supabaseAdmin.from("generated_posts").update({
                status: "failed", last_publish_error: "Nu sunt conturi selectate.",
              }).eq("id", post.id);
              continue;
            }

            const text = [post.title, post.copy ?? post.short_copy, post.hashtags, post.call_to_action]
              .filter((s): s is string => Boolean(s)).map(s => s.trim()).join("\n\n");

            let imageUrl: string | undefined;
            if (post.image_url) {
              const { data: signed } = await supabaseAdmin.storage
                .from("post-images")
                .createSignedUrl(post.image_url, 60 * 60 * 24);
              imageUrl = signed?.signedUrl;
            }

            const connIds = Array.from(new Set(targets.map(t => t.split(":")[0])));
            const { data: conns } = await supabaseAdmin
              .from("meta_connections")
              .select("id,page_id,page_access_token,ig_business_id")
              .in("id", connIds)
              .eq("user_id", post.user_id);

            const byId = new Map((conns ?? []).map(c => [c.id, c]));
            let ok = 0, fail = 0;
            const errs: string[] = [];

            for (const t of targets) {
              const [connId, kind] = t.split(":") as [string, "fb" | "ig"];
              const c = byId.get(connId);
              if (!c) { fail++; errs.push(`${t}: conexiune lipsă`); continue; }
              try {
                if (kind === "fb") {
                  await publishToFacebookPage({
                    pageId: c.page_id, pageAccessToken: c.page_access_token,
                    message: text, imageUrl,
                  });
                  ok++;
                } else {
                  if (!c.ig_business_id) throw new Error("Fără cont IG Business.");
                  if (!imageUrl) throw new Error("Instagram necesită imagine.");
                  await publishToInstagram({
                    igBusinessId: c.ig_business_id, pageAccessToken: c.page_access_token,
                    imageUrl, caption: text,
                  });
                  ok++;
                }
              } catch (e: any) {
                fail++;
                errs.push(`${t}: ${e?.message ?? "eroare"}`);
              }
            }

            await supabaseAdmin.from("generated_posts").update({
              status: ok > 0 ? "published" : "failed",
              published_at: ok > 0 ? new Date().toISOString() : null,
              last_publish_error: errs.length ? errs.join(" | ") : null,
            }).eq("id", post.id);

            summary.push({ post_id: post.id, ok, fail, errors: errs });
          }

          return Response.json({ processed: summary.length, summary });
        } catch (e: any) {
          console.error("[cron publish-scheduled]", e);
          return new Response(
            JSON.stringify({ error: e?.message ?? "unknown" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run worker" }),
    },
  },
});
