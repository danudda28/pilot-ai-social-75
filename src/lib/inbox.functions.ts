import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RESP_ROLES = ["owner", "admin", "marketer", "agent"];

async function brandFor(sb: any, userId: string, brandId?: string) {
  const { resolveBrandId } = await import("./brand-context.server");
  return resolveBrandId(sb, userId, brandId);
}

export const getInboxStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: conns } = await sb.from("meta_connections").select("id").eq("user_id", context.userId);
    const ids = (conns ?? []).map(c => c.id);
    const { data: health } = ids.length ? await sb.from("social_connection_health").select("scopes").in("connection_id", ids) : { data: [] as { scopes: string[] }[] };
    const scopes = new Set((health ?? []).flatMap(h => h.scopes ?? []));
    const needed = ["pages_messaging", "pages_manage_metadata", "instagram_manage_messages", "pages_manage_engagement", "instagram_manage_comments"];
    return {
      connected: ids.length > 0,
      checked: (health ?? []).length > 0,
      missingScopes: (health ?? []).length ? needed.filter(s => !scopes.has(s)) : needed,
    };
  });

export const listConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    filter: z.enum(["all", "unread", "pending", "human", "closed", "comments"]).default("all"),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const brandId = await brandFor(context.supabase, context.userId);
    if (!brandId) return [];
    let q = context.supabase.from("conversations").select("id,channel,customer_name,customer_id,status,ai_paused,unread,last_message_at").eq("brand_id", brandId).order("last_message_at", { ascending: false }).limit(100);
    if (data.filter === "unread") q = q.gt("unread", 0);
    else if (data.filter === "pending") q = q.eq("status", "pending");
    else if (data.filter === "human") q = q.eq("status", "human");
    else if (data.filter === "closed") q = q.eq("status", "closed");
    else if (data.filter === "comments") q = q.in("channel", ["fb_comment", "ig_comment"]);
    else q = q.neq("status", "closed");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map(r => r.id);
    const { data: last } = ids.length ? await context.supabase.from("messages").select("conversation_id,body,direction,sent_at").in("conversation_id", ids).order("sent_at", { ascending: false }).limit(300) : { data: [] as any[] };
    const preview = new Map<string, string>();
    for (const m of last ?? []) if (!preview.has(m.conversation_id)) preview.set(m.conversation_id, (m.direction === "out" ? "Tu: " : "") + m.body);
    return (rows ?? []).map(r => ({ ...r, preview: preview.get(r.id) ?? "" }));
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const [{ data: conv }, { data: msgs }, { data: drafts }] = await Promise.all([
      sb.from("conversations").select("*").eq("id", data.id).maybeSingle(),
      sb.from("messages").select("id,direction,body,author_name,sent_at,hidden").eq("conversation_id", data.id).order("sent_at").limit(200),
      sb.from("ai_reply_drafts").select("id,body,sources,confidence,handoff_suggested,reason,status,created_at").eq("conversation_id", data.id).eq("status", "pending").order("created_at", { ascending: false }).limit(1),
    ]);
    if (!conv) throw new Error("Conversație inexistentă.");
    if (conv.unread > 0) await sb.from("conversations").update({ unread: 0 }).eq("id", conv.id);
    const windowOpen = conv.channel === "fb_comment" || conv.channel === "ig_comment" || (conv.last_inbound_at ? Date.now() - new Date(conv.last_inbound_at).getTime() < 24 * 3600 * 1000 : false);
    return { conversation: conv, messages: msgs ?? [], draft: drafts?.[0] ?? null, windowOpen };
  });

/** Sends a reply through Meta. Only after explicit human action (draft mode). */
export const sendReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid(), text: z.string().trim().min(1).max(2000), draftId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: conv } = await sb.from("conversations").select("*").eq("id", data.conversationId).maybeSingle();
    if (!conv) throw new Error("Conversație inexistentă.");
    const { data: ok } = await sb.rpc("has_org_role", { _org: conv.organization_id, _roles: RESP_ROLES as any });
    if (!ok) throw new Error("Nu ai drept să răspunzi în această afacere.");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await admin.from("meta_connections").select("page_id,page_access_token").eq("id", conv.connection_id ?? "").maybeSingle();
    if (!conn) throw new Error("Pagina nu mai este conectată. Reconecteaz-o din Integrări.");
    const meta = await import("./meta.server");
    const { friendlyMetaError } = await import("./publishing-queue.server");
    let externalId: string;
    try {
      if (conv.channel === "messenger" || conv.channel === "instagram") {
        if (!conv.last_inbound_at || Date.now() - new Date(conv.last_inbound_at).getTime() > 24 * 3600 * 1000)
          throw new Error("Au trecut peste 24 de ore de la ultimul mesaj al clientului. Meta nu mai permite răspunsul din aplicație.");
        externalId = (await meta.sendDirectMessage({ pageId: conn.page_id, pageAccessToken: conn.page_access_token, recipientId: conv.customer_id ?? "", text: data.text })).id;
      } else {
        externalId = (await meta.replyToComment({ commentId: conv.external_id, pageAccessToken: conn.page_access_token, text: data.text, kind: conv.channel === "fb_comment" ? "fb" : "ig" })).id;
      }
    } catch (e: any) {
      throw new Error(friendlyMetaError(e?.message ?? "Trimiterea a eșuat."));
    }
    const now = new Date().toISOString();
    await admin.from("messages").insert({ brand_id: conv.brand_id, organization_id: conv.organization_id, conversation_id: conv.id, direction: "out", body: data.text, external_id: externalId, sent_by: context.userId, sent_at: now });
    await admin.from("conversations").update({ last_message_at: now, status: conv.status === "pending" || conv.status === "open" ? "open" : conv.status }).eq("id", conv.id);
    if (data.draftId) await admin.from("ai_reply_drafts").update({ status: "sent", edited_text: data.text, decided_by: context.userId }).eq("id", data.draftId);
    return { ok: true };
  });

export const rejectDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("ai_reply_drafts").update({ status: "rejected", decided_by: context.userId }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const regenerateDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: conv } = await context.supabase.from("conversations").select("id,organization_id").eq("id", data.conversationId).maybeSingle();
    if (!conv) throw new Error("Conversație inexistentă.");
    const { data: last } = await context.supabase.from("messages").select("id").eq("conversation_id", conv.id).eq("direction", "in").order("sent_at", { ascending: false }).limit(1).maybeSingle();
    if (!last) throw new Error("Nu există mesaj de la client.");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    await admin.from("conversations").update({ ai_paused: false, status: "open" }).eq("id", conv.id);
    const { draftForConversation } = await import("./inbox-agent.server");
    const id = await draftForConversation(admin, conv.id, last.id);
    if (!id) throw new Error("Agentul AI e oprit din setări.");
    return { ok: true };
  });

export const setConversationState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), action: z.enum(["takeover", "release", "close", "reopen"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const patch = data.action === "takeover" ? { status: "human", ai_paused: true }
      : data.action === "release" ? { status: "open", ai_paused: false }
      : data.action === "close" ? { status: "closed" } : { status: "open" };
    const { error } = await context.supabase.from("conversations").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.action === "takeover" || data.action === "close")
      await context.supabase.from("ai_reply_drafts").update({ status: "rejected" }).eq("conversation_id", data.id).eq("status", "pending");
    return { ok: true };
  });

export const hideCommentFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: conv } = await context.supabase.from("conversations").select("*").eq("id", data.conversationId).maybeSingle();
    if (!conv || (conv.channel !== "fb_comment" && conv.channel !== "ig_comment")) throw new Error("Doar comentariile pot fi ascunse.");
    const { data: ok } = await context.supabase.rpc("has_org_role", { _org: conv.organization_id, _roles: RESP_ROLES as any });
    if (!ok) throw new Error("Nu ai drept pentru această acțiune.");
    const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
    const { data: conn } = await admin.from("meta_connections").select("page_access_token").eq("id", conv.connection_id ?? "").maybeSingle();
    if (!conn) throw new Error("Pagina nu mai este conectată.");
    const { hideComment } = await import("./meta.server");
    const { friendlyMetaError } = await import("./publishing-queue.server");
    try { await hideComment({ commentId: conv.external_id, pageAccessToken: conn.page_access_token, kind: conv.channel === "fb_comment" ? "fb" : "ig" }); }
    catch (e: any) { throw new Error(friendlyMetaError(e?.message ?? "Nu am putut ascunde comentariul.")); }
    await admin.from("messages").update({ hidden: true }).eq("conversation_id", conv.id).eq("external_id", conv.external_id);
    await admin.from("conversations").update({ status: "closed" }).eq("id", conv.id);
    return { ok: true };
  });

// ---------- Agent settings + Test Lab ----------

const settingsSchema = z.object({
  enabled: z.boolean(),
  working_hours: z.object({ start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/), days: z.array(z.number().int().min(0).max(6)) }),
  forbidden_topics: z.array(z.string().trim().min(1).max(80)).max(30),
  handoff_keywords: z.array(z.string().trim().min(1).max(60)).max(50),
  handoff_message: z.string().trim().min(5).max(500),
  auto_send: z.boolean().default(false),
  auto_send_min_confidence: z.number().min(0.5).max(1).default(0.85),
  auto_send_daily_limit: z.number().int().min(1).max(200).default(20),
  auto_send_intents: z.array(z.string().trim().min(1).max(40)).max(10).default(["program", "locație", "contact", "servicii"]),
});

export const getAgentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const brandId = await brandFor(context.supabase, context.userId);
    if (!brandId) throw new Error("Nu ai niciun brand.");
    const { loadAgentSettings } = await import("./inbox-agent.server");
    return { brandId, settings: await loadAgentSettings(context.supabase, brandId) };
  });

export const saveAgentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsSchema.extend({ brandId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { brandId, ...fields } = data;
    const { error } = await context.supabase.from("agent_settings")
      .upsert({ ...fields, brand_id: brandId, mode: "draft", organization_id: "00000000-0000-0000-0000-000000000000" }, { onConflict: "brand_id" });
    if (error) throw new Error(error.message.includes("row-level") ? "Doar proprietarul, administratorul sau marketerul pot schimba setările agentului." : error.message);
    return { ok: true };
  });

export const testAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ message: z.string().trim().min(1).max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const brandId = await brandFor(context.supabase, context.userId);
    if (!brandId) throw new Error("Nu ai niciun brand.");
    const { runAgent } = await import("./inbox-agent.server");
    return runAgent(context.supabase, brandId, data.message);
  });

/** Webhook setup details for Meta Developer; restricted to platform admins. */
export const getWebhookSetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return null;
    return { path: "/api/public/webhooks/meta", verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN ?? null };
  });
