import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron zilnic (dimineața): trimite câte o notificare-rezumat per brand cu ce s-a
 * întâmplat ieri — postări publicate, mesaje primite, leaduri noi, răspunsuri automate.
 * Apelat din pg_cron, ca celelalte cronuri.
 */
export const Route = createFileRoute("/api/public/cron/daily-digest")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { notifyOrg } = await import("@/lib/notify.server");
        const dayStart = new Date(); dayStart.setDate(dayStart.getDate() - 1); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999);
        const from = dayStart.toISOString(), to = dayEnd.toISOString();
        const dayLabel = dayStart.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long" });

        const { data: brands } = await supabaseAdmin.from("brands").select("id,name,organization_id").is("deleted_at", null);
        let sent = 0;
        for (const b of brands ?? []) {
          if (!b.organization_id) continue;
          try {
            const [posts, msgs, leads, autos] = await Promise.all([
              supabaseAdmin.from("generated_posts").select("id", { count: "exact", head: true }).eq("brand_id", b.id).eq("status", "published").gte("updated_at", from).lte("updated_at", to),
              supabaseAdmin.from("messages").select("id", { count: "exact", head: true }).eq("brand_id", b.id).eq("direction", "in").gte("sent_at", from).lte("sent_at", to),
              supabaseAdmin.from("leads").select("id", { count: "exact", head: true }).eq("brand_id", b.id).gte("created_at", from).lte("created_at", to),
              supabaseAdmin.from("auto_send_log").select("id", { count: "exact", head: true }).eq("brand_id", b.id).gte("created_at", from).lte("created_at", to),
            ]);
            const p = posts.count ?? 0, m = msgs.count ?? 0, l = leads.count ?? 0, a = autos.count ?? 0;
            if (!p && !m && !l && !a) continue; // nimic de raportat
            const parts = [
              p ? `${p} ${p === 1 ? "postare publicată" : "postări publicate"}` : null,
              m ? `${m} ${m === 1 ? "mesaj primit" : "mesaje primite"}` : null,
              a ? `${a} ${a === 1 ? "răspuns automat" : "răspunsuri automate"}` : null,
              l ? `${l} ${l === 1 ? "lead nou" : "leaduri noi"}` : null,
            ].filter(Boolean).join(", ");
            await notifyOrg(supabaseAdmin, b.organization_id, "digest",
              `Rezumatul de ${dayLabel} — ${b.name}`, parts + ".", "/dashboard");
            sent++;
          } catch (e: any) {
            console.error("[cron daily-digest]", b.id, e?.message);
          }
        }
        return Response.json({ ok: true, digests: sent });
      },
    },
  },
});
