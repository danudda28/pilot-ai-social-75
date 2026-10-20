/** Cont demo doar pe localhost (dev). Nu atinge Supabase cloud. */

export const LOCAL_DEV_EMAIL = "client.max@local.dev";
export const LOCAL_DEV_PASSWORD = "SparkMax2026!";
export const LOCAL_DEV_TOKEN = "local-dev.spark-max-agentie";
export const LOCAL_DEV_USER_ID = "00000000-0000-4000-8000-000000000001";
export const LOCAL_DEV_BRAND_ID = "00000000-0000-4000-8000-000000000002";
export const LOCAL_DEV_ORG_ID = "00000000-0000-4000-8000-000000000003";

const STORAGE_KEY = "ss-local-dev-session";

/** In-memory posts for local Studio (server process lifetime). */
const localPosts = new Map<string, Record<string, unknown>>();

export function isLocalDevAuthEnabled() {
  if (typeof window !== "undefined") {
    return import.meta.env.DEV && (location.hostname === "localhost" || location.hostname === "127.0.0.1");
  }
  return process.env.NODE_ENV !== "production";
}

export function isLocalDevToken(token: string | null | undefined) {
  return !!token && token === LOCAL_DEV_TOKEN;
}

export type LocalDevSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "bearer";
  user: {
    id: string;
    email: string;
    role: string;
    app_metadata: Record<string, unknown>;
    user_metadata: { full_name: string; company_name: string };
    aud: string;
    created_at: string;
  };
};

export function getLocalDevUser() {
  return {
    id: LOCAL_DEV_USER_ID,
    email: LOCAL_DEV_EMAIL,
    role: "authenticated",
    app_metadata: { provider: "local-dev", providers: ["local-dev"] },
    user_metadata: { full_name: "Client Maxim", company_name: "Afacerea Demo Max" },
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

export function buildLocalDevSession(): LocalDevSession {
  return {
    access_token: LOCAL_DEV_TOKEN,
    refresh_token: LOCAL_DEV_TOKEN,
    expires_in: 60 * 60 * 24 * 30,
    token_type: "bearer",
    user: getLocalDevUser(),
  };
}

export function readLocalDevSession(): LocalDevSession | null {
  if (typeof window === "undefined" || !isLocalDevAuthEnabled()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalDevSession;
    if (parsed?.access_token !== LOCAL_DEV_TOKEN) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocalDevSession(session: LocalDevSession | null) {
  if (typeof window === "undefined") return;
  if (!session) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function localDevCredentialsMatch(email: string, password: string) {
  return email.trim().toLowerCase() === LOCAL_DEV_EMAIL && password === LOCAL_DEV_PASSWORD;
}

export function getLocalDevProfile() {
  return {
    id: LOCAL_DEV_USER_ID,
    user_id: LOCAL_DEV_USER_ID,
    full_name: "Client Maxim",
    company_name: "Afacerea Demo Max",
    subscription_plan: "agentie",
    subscription_status: "active",
    posts_remaining: 700,
    onboarding_completed: true,
    current_brand_id: LOCAL_DEV_BRAND_ID,
    referral_code: "LOCALMAX",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

export function getLocalDevBrand() {
  return {
    id: LOCAL_DEV_BRAND_ID,
    owner_id: LOCAL_DEV_USER_ID,
    organization_id: LOCAL_DEV_ORG_ID,
    name: "Afacerea Demo Max",
    short_description: "Brand demo local cu plan Agenție.",
    category: "servicii",
    languages: ["ro"],
    timezone: "Europe/Bucharest",
    currency: "RON",
    onboarding_step: 3,
    onboarding_completed_at: "2026-01-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

type MockResult = { data: unknown; error: null; count: number | null };

function ok(data: unknown, count: number | null = null): MockResult {
  return { data, error: null, count };
}

function newId() {
  return crypto.randomUUID();
}

/** Query builder minimal pentru datele contului local. */
export function createLocalDevQuery(table: string) {
  const filters: Array<{ col: string; val: unknown }> = [];
  let wantSingle = false;
  let wantMaybe = false;
  let wantHead = false;
  let wantCount: "exact" | null = null;
  let insertPayload: Record<string, unknown> | null = null;
  let updatePayload: Record<string, unknown> | null = null;
  let didSelect = false;

  const resolve = (): MockResult => {
    const profile = getLocalDevProfile();
    const brand = getLocalDevBrand();

    if (table === "users_profiles") {
      if (wantHead) return ok(null, 1);
      if (updatePayload) {
        Object.assign(profile, updatePayload);
      }
      return wantSingle || wantMaybe ? ok(profile) : ok([profile]);
    }
    if (table === "brands") {
      if (wantHead) return ok(null, 1);
      return wantSingle || wantMaybe ? ok(brand) : ok([brand]);
    }
    if (table === "brand_members") {
      if (didSelect && !insertPayload) {
        const row = {
          role: "owner",
          brands: brand,
        };
        // nested select shape used by listMyBrands
        const membership = {
          role: "owner",
          brands: brand,
        };
        return wantSingle || wantMaybe ? ok(membership) : ok([membership]);
      }
      const row = { id: newId(), brand_id: LOCAL_DEV_BRAND_ID, user_id: LOCAL_DEV_USER_ID, role: "owner" };
      if (insertPayload) {
        return wantSingle || wantMaybe
          ? ok({ ...row, ...insertPayload })
          : ok([{ ...row, ...insertPayload }]);
      }
      return wantSingle || wantMaybe ? ok(row) : ok([row]);
    }
    if (table === "organizations") {
      const row = { id: LOCAL_DEV_ORG_ID, name: "Afacerea Demo Max", plan: "agentie", created_by: LOCAL_DEV_USER_ID };
      return wantSingle || wantMaybe ? ok(row) : ok([row]);
    }
    if (table === "organization_members") {
      const row = { organization_id: LOCAL_DEV_ORG_ID, user_id: LOCAL_DEV_USER_ID, role: "owner", created_at: "2026-01-01T00:00:00.000Z" };
      return wantSingle || wantMaybe ? ok(row) : ok([row]);
    }
    if (table === "notification_preferences") {
      const row = { user_id: LOCAL_DEV_USER_ID };
      return wantSingle || wantMaybe ? ok(row) : ok([row]);
    }
    if (table === "generated_posts") {
      if (insertPayload) {
        const id = (insertPayload.id as string) || newId();
        const row = {
          id,
          user_id: LOCAL_DEV_USER_ID,
          brand_id: LOCAL_DEV_BRAND_ID,
          platform: "both",
          content_type: "static",
          status: "draft",
          approval_status: "pending",
          created_at: new Date().toISOString(),
          ...insertPayload,
        };
        localPosts.set(id, row);
        return wantSingle || wantMaybe ? ok(row) : ok([row]);
      }
      if (updatePayload) {
        const idFilter = filters.find((f) => f.col === "id");
        const id = String(idFilter?.val ?? "");
        const existing = localPosts.get(id) ?? { id, user_id: LOCAL_DEV_USER_ID };
        const row = { ...existing, ...updatePayload };
        localPosts.set(id, row);
        return wantSingle || wantMaybe ? ok(row) : ok([row]);
      }
      if (wantHead) return ok(null, localPosts.size);
      const all = Array.from(localPosts.values());
      const idFilter = filters.find((f) => f.col === "id");
      if (idFilter) {
        const row = localPosts.get(String(idFilter.val)) ?? null;
        return wantSingle || wantMaybe ? ok(row) : ok(row ? [row] : []);
      }
      return wantSingle || wantMaybe ? ok(all[0] ?? null) : ok(all);
    }
    if (table === "brands" || table === "connected_accounts" || table === "social_profiles") {
      return wantSingle || wantMaybe ? ok(null) : ok([]);
    }

    // Liste goale pentru restul — UI-ul se deschide fără erori
    if (wantHead) return ok(null, 0);
    if (insertPayload) {
      const row = { id: newId(), ...insertPayload };
      return wantSingle || wantMaybe ? ok(row) : ok([row]);
    }
    return wantSingle || wantMaybe ? ok(null) : ok([]);
  };

  const api: Record<string, unknown> = {
    select: (_cols?: string, opts?: { count?: "exact"; head?: boolean }) => {
      didSelect = true;
      if (opts?.count) wantCount = opts.count;
      if (opts?.head) wantHead = true;
      return api;
    },
    insert: (payload: unknown) => {
      insertPayload = Array.isArray(payload)
        ? (payload[0] as Record<string, unknown>)
        : (payload as Record<string, unknown>);
      return api;
    },
    update: (payload: unknown) => {
      updatePayload = payload as Record<string, unknown>;
      return api;
    },
    upsert: (payload: unknown) => {
      insertPayload = Array.isArray(payload)
        ? (payload[0] as Record<string, unknown>)
        : (payload as Record<string, unknown>);
      return api;
    },
    delete: () => api,
    eq: (col: string, val: unknown) => {
      filters.push({ col, val });
      return api;
    },
    neq: () => api,
    in: () => api,
    is: () => api,
    gte: () => api,
    lte: () => api,
    gt: () => api,
    lt: () => api,
    like: () => api,
    ilike: () => api,
    contains: () => api,
    order: () => api,
    limit: () => api,
    range: () => api,
    match: () => api,
    filter: () => api,
    single: () => {
      wantSingle = true;
      return Promise.resolve(resolve());
    },
    maybeSingle: () => {
      wantMaybe = true;
      return Promise.resolve(resolve());
    },
    then: (resolveFn: (v: MockResult) => unknown, rejectFn?: (e: unknown) => unknown) =>
      Promise.resolve(resolve()).then(resolveFn, rejectFn),
  };

  void wantCount;
  return api;
}

export async function localDevRpc(fn: string, args?: Record<string, unknown>) {
  if (fn === "has_role") {
    return { data: false, error: null };
  }
  if (fn === "is_brand_member" || fn === "is_org_member") {
    return { data: true, error: null };
  }
  if (fn === "has_brand_role" || fn === "has_org_role") {
    return { data: true, error: null };
  }
  void args;
  return { data: null, error: null };
}
