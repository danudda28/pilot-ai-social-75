/**
 * Meta webhooks (Page + Instagram): messages and comments.
 * GET: subscription verification (hub.challenge). POST: HMAC-verified events → conversations/messages → AI draft.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";

type Inbound = {
  channel: "messenger" | "instagram" | "fb_comment" | "ig_comment";
  accountId: string; // page id or ig business id
  threadId: string; // customer id (DM) or comment id
  customerId: string; customerName?: string;
  externalMsgId: string; text: string; at: Date; postId?: string;
};

function normalize(body: any): Inbound[] {
  const out: Inbound[] = [];
  const isIg = body?.object === "instagram";
  for (const entry of body?.entry ?? []) {
    const accountId = String(entry.id);
    for (const m of entry.messaging ?? []) {
      if (!m.message || m.message.is_echo || !m.sender?.id || m.sender.id === accountId) continue;
      out.push({
        channel: isIg ? "instagram" : "messenger", accountId, threadId: String(m.sender.id), customerId: String(m.sender.id),
        externalMsgId: String(m.message.mid), text: String(m.message.text ?? (m.message.attachments ? "[atașament]" : "")), at: new Date(m.timestamp ?? Date.now()),
      });
    }
    for (const c of entry.changes ?? []) {
      const v = c.value ?? {};
      if (!isIg && c.field === "feed" && v.item === "comment" && v.verb === "add" && v.from?.id !== accountId) {
        out.push({
          channel: "fb_comment", accountId, threadId: String(v.comment_id), customerId: String(v.from?.id ?? ""), customerName: v.from?.name,
          externalMsgId: String(v.comment_id), text: String(v.message ?? ""), at: new Date((v.created_time ?? Date.now() / 1000) * 1000), postId: v.post_id,
        });
      }
      if (isIg && c.field === "comments" && v.id && v.from?.id !== accountId) {
        out.push({
          channel: "ig_comment", accountId, threadId: String(v.id), customerId: String(v.from?.id ?? ""), customerName: v.from?.username,
          externalMsgId: String(v.id), text: String(v.text ?? ""), at: new Date(), postId: v.media?.id,
        });
      }
    }
  }
  return out;
}

async function resolveBrand(admin: any, conn: any): Promise<string | null> {
  if (conn.brand_id) return conn.brand_id;
  const { data: p } = await admin.from("users_profiles").select("current_brand_id").eq("user_id", conn.user_id).maybeSingle();
  if (p?.current_brand_id) return p.current_brand_id;
  const { data: bm } = await admin.from("brand_members").select("brand_id").eq("user_id", conn.user_id).eq("role", "owner").limit(1).maybeSingle();
  return bm?.brand_id ?? null;
}

export const Route = createFileRoute("/api/public/webhooks/meta")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
        if (mode === "subscribe" && expected && token === expected && challenge) return new Response(challenge, { status: 200 });
        return new Response("Forbidden", { status: 403 });
      },
      POST: async ({ request }) => {
        const raw = await request.text();
        const { verifyWebhookSignature } = await import("@/lib/meta.server");
        let valid = false;
        try { valid = verifyWebhookSignature(raw, request.headers.get("x-hub-signature-256")); } catch { valid = false; }
        if (!valid) return new Response("Invalid signature", { status: 401 });

        let body: any;
        try { body = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }
        const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
        const dedupe = createHash("sha256").update(raw).digest("hex");
        const { data: ev, error: evErr } = await admin.from("webhook_events")
          .insert({ source: "meta", object: body?.object ?? null, dedupe_key: dedupe, payload: body, signature_valid: true }).select("id").maybeSingle();
        if (evErr) return new Response("ok", { status: 200 }); // duplicate delivery

        try {
          const { draftForConversation } = await import("@/lib/inbox-agent.server");
          for (const item of normalize(body)) {
            const col = item.channel === "instagram" || item.channel === "ig_comment" ? "ig_business_id" : "page_id";
            const { data: conn } = await admin.from("meta_connections").select("id,user_id,brand_id").eq(col, item.accountId).limit(1).maybeSingle();
            if (!conn) continue;
            const brandId = await resolveBrand(admin, conn);
            if (!brandId) continue;

            const { data: conv } = await admin.from("conversations").upsert({
              brand_id: brandId, organization_id: "00000000-0000-0000-0000-000000000000", connection_id: conn.id, channel: item.channel, external_id: item.threadId,
              customer_id: item.customerId, ...(item.customerName ? { customer_name: item.customerName } : {}), post_external_id: item.postId ?? null,
              last_message_at: item.at.toISOString(), last_inbound_at: item.at.toISOString(),
            }, { onConflict: "channel,external_id" }).select("id,unread,status").single();
            if (!conv) continue;

            const { data: msg, error: mErr } = await admin.from("messages").insert({
              brand_id: brandId, organization_id: "00000000-0000-0000-0000-000000000000", conversation_id: conv.id, direction: "in",
              body: item.text, external_id: item.externalMsgId, author_name: item.customerName ?? null, sent_at: item.at.toISOString(),
            }).select("id").maybeSingle();
            if (mErr || !msg) continue; // already stored
            await admin.from("conversations").update({ unread: (conv.unread ?? 0) + 1, ...(conv.status === "closed" ? { status: "open" } : {}) }).eq("id", conv.id);
            await draftForConversation(admin, conv.id, msg.id).catch(e => console.warn("[inbox draft]", e?.message));
          }
          if (ev) await admin.from("webhook_events").update({ processed: true }).eq("id", ev.id);
        } catch (e: any) {
          console.error("[meta webhook]", e);
          if (ev) await admin.from("webhook_events").update({ error: String(e?.message ?? e) }).eq("id", ev.id);
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
