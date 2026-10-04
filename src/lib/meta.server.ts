/**
 * Meta Graph API helpers. SERVER ONLY (uses META_APP_SECRET).
 * Docs: https://developers.facebook.com/docs/graph-api
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

export const META_SCOPES = [
  "ads_read",
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
  "public_profile",
  // Phase 3: inbox + comments (require App Review for non-test users)
  "pages_messaging",
  "pages_manage_metadata",
  "pages_read_user_content",
  "pages_manage_engagement",
  "instagram_manage_messages",
  "instagram_manage_comments",
];

function appCreds() {
  const id = process.env.META_APP_ID;
  const secret = process.env.META_APP_SECRET;
  if (!id || !secret) throw new Error("META_APP_ID / META_APP_SECRET nu sunt configurate.");
  return { id, secret };
}

// ---------- State signing (CSRF + user binding) ----------

export function signState(payload: { userId: string; origin: string }): string {
  const { secret } = appCreds();
  const body = Buffer.from(
    JSON.stringify({ ...payload, ts: Date.now(), nonce: Math.random().toString(36).slice(2) }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyState(state: string): { userId: string; origin: string } {
  const { secret } = appCreds();
  const [body, sig] = state.split(".");
  if (!body || !sig) throw new Error("State malformat.");
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("State invalid.");
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as {
    userId: string; origin: string; ts: number;
  };
  if (Date.now() - parsed.ts > 10 * 60 * 1000) throw new Error("State expirat (>10 min).");
  return { userId: parsed.userId, origin: parsed.origin };
}

// ---------- OAuth ----------

export function buildAuthUrl(redirectUri: string, state: string): string {
  const { id } = appCreds();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: redirectUri,
    state,
    scope: META_SCOPES.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  const { id, secret } = appCreds();
  const url = `${GRAPH}/oauth/access_token?client_id=${id}&client_secret=${secret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${encodeURIComponent(code)}`;
  const res = await fetch(url);
  const json = await res.json() as any;
  if (!res.ok || json.error) throw new Error(`Token exchange: ${json.error?.message ?? res.status}`);
  return json.access_token as string;
}

export async function exchangeForLongLivedToken(shortToken: string): Promise<{ token: string; expiresIn: number }> {
  const { id, secret } = appCreds();
  const url = `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${id}&client_secret=${secret}&fb_exchange_token=${shortToken}`;
  const res = await fetch(url);
  const json = await res.json() as any;
  if (!res.ok || json.error) throw new Error(`Long-lived token: ${json.error?.message ?? res.status}`);
  return { token: json.access_token, expiresIn: json.expires_in ?? 60 * 24 * 3600 };
}

// ---------- Pages & IG ----------

export type FbPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
};

/** Looks up the IG Business/Creator account linked to a page, using the PAGE token. */
export async function getPageInstagram(pageId: string, pageAccessToken: string): Promise<{ id: string; username?: string } | null> {
  try {
    const res = await fetch(
      `${GRAPH}/${pageId}?fields=instagram_business_account{id,username},connected_instagram_account{id,username}&access_token=${pageAccessToken}`,
    );
    const json = await res.json() as any;
    if (!res.ok || json.error) return null;
    const ig = json.instagram_business_account ?? json.connected_instagram_account;
    if (!ig?.id) return null;
    let username = ig.username as string | undefined;
    if (!username) {
      const uRes = await fetch(`${GRAPH}/${ig.id}?fields=username&access_token=${pageAccessToken}`);
      const uJson = await uRes.json() as any;
      username = uJson?.username;
    }
    return { id: ig.id, username };
  } catch {
    return null;
  }
}

export async function getMeAndPages(userToken: string): Promise<{ user: { id: string; name: string }; pages: FbPage[] }> {
  const meRes = await fetch(`${GRAPH}/me?fields=id,name&access_token=${userToken}`);
  const me = await meRes.json() as any;
  if (!meRes.ok || me.error) throw new Error(`Me: ${me.error?.message ?? meRes.status}`);

  const pagesRes = await fetch(`${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username},connected_instagram_account{id,username}&access_token=${userToken}`);
  const pagesJson = await pagesRes.json() as any;
  if (!pagesRes.ok || pagesJson.error) throw new Error(`Pages: ${pagesJson.error?.message ?? pagesRes.status}`);

  const pages = (pagesJson.data ?? []) as (FbPage & { connected_instagram_account?: { id: string; username?: string } })[];

  // Fallback: /me/accounts sometimes omits the IG link; re-query with the page token.
  await Promise.all(
    pages.map(async (p) => {
      if (!p.instagram_business_account?.id) {
        const ig = p.connected_instagram_account?.id
          ? p.connected_instagram_account
          : await getPageInstagram(p.id, p.access_token);
        if (ig?.id) p.instagram_business_account = ig;
      }
    }),
  );

  return {
    user: { id: me.id, name: me.name },
    pages: pages as FbPage[],
  };
}


// ---------- Publishing ----------

export async function publishToFacebookPage(args: {
  pageId: string;
  pageAccessToken: string;
  message: string;
  imageUrl?: string;
}): Promise<{ id: string }> {
  const { pageId, pageAccessToken, message, imageUrl } = args;
  const endpoint = imageUrl ? `${GRAPH}/${pageId}/photos` : `${GRAPH}/${pageId}/feed`;
  const body = new URLSearchParams({ access_token: pageAccessToken });
  if (imageUrl) {
    body.set("url", imageUrl);
    body.set("caption", message);
  } else {
    body.set("message", message);
  }
  const res = await fetch(endpoint, { method: "POST", body });
  const json = await res.json() as any;
  if (!res.ok || json.error) throw new Error(`FB publish: ${json.error?.message ?? res.status}`);
  return { id: json.id ?? json.post_id };
}

export async function publishToInstagram(args: {
  igBusinessId: string;
  pageAccessToken: string;
  imageUrl: string; // IG requires image
  caption: string;
}): Promise<{ id: string }> {
  const { igBusinessId, pageAccessToken, imageUrl, caption } = args;
  const containerBody = new URLSearchParams({
    image_url: imageUrl,
    caption,
    access_token: pageAccessToken,
  });
  const cRes = await fetch(`${GRAPH}/${igBusinessId}/media`, { method: "POST", body: containerBody });
  const cJson = await cRes.json() as any;
  if (!cRes.ok || cJson.error) throw new Error(`IG container: ${cJson.error?.message ?? cRes.status}`);

  const pBody = new URLSearchParams({ creation_id: cJson.id, access_token: pageAccessToken });
  const pRes = await fetch(`${GRAPH}/${igBusinessId}/media_publish`, { method: "POST", body: pBody });
  const pJson = await pRes.json() as any;
  if (!pRes.ok || pJson.error) throw new Error(`IG publish: ${pJson.error?.message ?? pRes.status}`);
  return { id: pJson.id };
}

// ---------- Insights ----------

/** Real per-post metrics using the Meta object id returned at publish. Returns null when unavailable. */
export async function fetchPostInsights(args: {
  pageAccessToken: string;
  externalId: string;
  kind: "fb" | "ig";
}): Promise<{ likes: number; comments: number; shares: number; reach: number } | null> {
  const { pageAccessToken, externalId, kind } = args;
  try {
    if (kind === "fb") {
      const res = await fetch(`${GRAPH}/${externalId}?fields=likes.summary(true).limit(0),comments.summary(true).limit(0),shares&access_token=${pageAccessToken}`);
      const j = await res.json() as any;
      if (!res.ok || j.error) return null;
      let reach = 0;
      const ir = await fetch(`${GRAPH}/${externalId}/insights?metric=post_impressions_unique&access_token=${pageAccessToken}`);
      const ij = await ir.json() as any;
      if (ir.ok && !ij.error) reach = ij.data?.[0]?.values?.[0]?.value ?? 0;
      return { likes: j.likes?.summary?.total_count ?? 0, comments: j.comments?.summary?.total_count ?? 0, shares: j.shares?.count ?? 0, reach };
    }
    const res = await fetch(`${GRAPH}/${externalId}?fields=like_count,comments_count&access_token=${pageAccessToken}`);
    const j = await res.json() as any;
    if (!res.ok || j.error) return null;
    let reach = 0;
    const ir = await fetch(`${GRAPH}/${externalId}/insights?metric=reach&access_token=${pageAccessToken}`);
    const ij = await ir.json() as any;
    if (ir.ok && !ij.error) reach = ij.data?.[0]?.values?.[0]?.value ?? 0;
    return { likes: j.like_count ?? 0, comments: j.comments_count ?? 0, shares: 0, reach };
  } catch {
    return null;
  }
}

// ---------- Connection health ----------

const REQUIRED_SCOPES = ["pages_show_list", "pages_manage_posts", "pages_read_engagement", "instagram_basic", "instagram_content_publish"];

export async function inspectConnection(args: { pageAccessToken: string; userAccessToken?: string | null }) {
  const { id, secret } = appCreds();
  const res = await fetch(`${GRAPH}/debug_token?input_token=${encodeURIComponent(args.pageAccessToken)}&access_token=${id}|${secret}`);
  const j = await res.json() as any;
  const d = j?.data ?? {};
  let scopes: string[] = d.scopes ?? [];
  if (args.userAccessToken) {
    try {
      const pr = await fetch(`${GRAPH}/me/permissions?access_token=${args.userAccessToken}`);
      const pj = await pr.json() as any;
      if (pr.ok && !pj.error) scopes = (pj.data ?? []).filter((p: any) => p.status === "granted").map((p: any) => p.permission);
    } catch { /* keep debug_token scopes */ }
  }
  const expires = d.expires_at && d.expires_at > 0 ? new Date(d.expires_at * 1000).toISOString() : null;
  return {
    valid: !!d.is_valid,
    expiresAt: expires,
    scopes,
    missing: REQUIRED_SCOPES.filter(s => !scopes.includes(s)),
    error: d.error?.message ?? j?.error?.message ?? null,
  };
}


// ---------- Inbox (Phase 3) ----------

async function graphPost(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${path}`, { method: "POST", body: new URLSearchParams(params) });
  const j = await res.json() as any;
  if (!res.ok || j.error) throw new Error(j.error?.message ?? `Meta ${res.status}`);
  return j;
}

export async function subscribePageToWebhooks(pageId: string, pageAccessToken: string) {
  return graphPost(`${pageId}/subscribed_apps`, {
    subscribed_fields: "messages,messaging_postbacks,feed",
    access_token: pageAccessToken,
  });
}

/** Messenger + Instagram DM send (Send API via the page). Standard 24h window applies. */
export async function sendDirectMessage(args: { pageId: string; pageAccessToken: string; recipientId: string; text: string }) {
  const j = await graphPost(`${args.pageId}/messages`, {
    recipient: JSON.stringify({ id: args.recipientId }),
    message: JSON.stringify({ text: args.text }),
    messaging_type: "RESPONSE",
    access_token: args.pageAccessToken,
  });
  return { id: (j.message_id ?? j.id) as string };
}

export async function replyToComment(args: { commentId: string; pageAccessToken: string; text: string; kind: "fb" | "ig" }) {
  const j = args.kind === "fb"
    ? await graphPost(`${args.commentId}/comments`, { message: args.text, access_token: args.pageAccessToken })
    : await graphPost(`${args.commentId}/replies`, { message: args.text, access_token: args.pageAccessToken });
  return { id: j.id as string };
}

export async function hideComment(args: { commentId: string; pageAccessToken: string; kind: "fb" | "ig" }) {
  return args.kind === "fb"
    ? graphPost(args.commentId, { is_hidden: "true", access_token: args.pageAccessToken })
    : graphPost(args.commentId, { hide: "true", access_token: args.pageAccessToken });
}

export function verifyWebhookSignature(rawBody: string, header: string | null): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const { secret } = appCreds();
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(header.slice(7)); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
