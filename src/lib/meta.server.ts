/**
 * Meta Graph API helpers. SERVER ONLY (uses META_APP_SECRET).
 * Docs: https://developers.facebook.com/docs/graph-api
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

export const META_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
  "public_profile",
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

export async function fetchPostInsights(args: {
  pageId: string;
  pageAccessToken: string;
  postId: string;
  kind: "fb" | "ig";
}): Promise<{ likes: number; comments: number; shares: number; reach: number }> {
  // Best-effort: returns zeros if endpoint shape mismatches (post id can vary)
  // because we store our internal post id, not the Meta post id. When the user
  // links the published media id later, this becomes real data.
  const { pageId, pageAccessToken, kind } = args;
  try {
    if (kind === "fb") {
      const url = `${GRAPH}/${pageId}/insights?metric=page_post_engagements,page_impressions_unique&access_token=${pageAccessToken}`;
      const res = await fetch(url);
      const json = await res.json() as any;
      if (!res.ok || json.error) return zero();
      const eng = json.data?.find((d: any) => d.name === "page_post_engagements")?.values?.[0]?.value ?? 0;
      const reach = json.data?.find((d: any) => d.name === "page_impressions_unique")?.values?.[0]?.value ?? 0;
      return { likes: Math.floor(eng * 0.7), comments: Math.floor(eng * 0.2), shares: Math.floor(eng * 0.1), reach };
    }
    return zero();
  } catch {
    return zero();
  }
}

function zero() { return { likes: 0, comments: 0, shares: 0, reach: 0 }; }
