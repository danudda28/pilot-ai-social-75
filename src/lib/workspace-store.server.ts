/**
 * Date pentru spațiul de lucru (chat + postări). Server only.
 * Contul local de dev → JSON pe disc (supraviețuiește restartului). Altfel → Supabase (RLS ca user).
 */
import { access, mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_DEV_USER_ID, getLocalDevBrand } from "./local-dev-auth";

export type BrandInfo = {
  id: string | null;
  name: string;
  category: string | null;
  short_description: string | null;
  target_audience: string | null;
  city: string | null;
  differentiators: string | null;
};

export type PostRow = {
  id: string;
  user_id: string;
  brand_id: string | null;
  content_type: string;
  title: string | null;
  copy: string | null;
  hashtags: string | null;
  call_to_action: string | null;
  visual_idea: string | null;
  image_url: string | null;
  status: string;
  scheduled_date: string | null;
  published_at: string | null;
  last_publish_error: string | null;
  created_at: string;
};

export type BrandPatch = Partial<Omit<BrandInfo, "id">>;

export type WorkspaceStore = {
  getBrand(): Promise<BrandInfo>;
  updateBrand(patch: BrandPatch): Promise<BrandInfo>;
  listPosts(): Promise<PostRow[]>;
  getPost(id: string): Promise<PostRow | null>;
  insertPost(row: Partial<PostRow> & { content_type: string }): Promise<PostRow>;
  updatePost(id: string, patch: Partial<PostRow>): Promise<PostRow | null>;
  deletePost(id: string): Promise<void>;
  listPhotoPaths(): Promise<string[]>;
};

const POST_COLS =
  "id,user_id,brand_id,content_type,title,copy,hashtags,call_to_action,visual_idea,image_url,status,scheduled_date,published_at,last_publish_error,created_at";
const BRAND_COLS = "id,name,category,short_description,target_audience,city,differentiators";

const DATA_DIR = path.join(process.cwd(), ".local-data");
const MEDIA_ROOT = path.join(process.cwd(), "public", "local-media");

type LocalFile = { brand: BrandPatch; posts: PostRow[] };

async function readLocal(userId: string): Promise<LocalFile> {
  try {
    const raw = await readFile(path.join(DATA_DIR, `workspace-${userId}.json`), "utf8");
    const parsed = JSON.parse(raw) as LocalFile;
    return { brand: parsed.brand ?? {}, posts: Array.isArray(parsed.posts) ? parsed.posts : [] };
  } catch {
    return { brand: {}, posts: [] };
  }
}

async function writeLocal(userId: string, data: LocalFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, `workspace-${userId}.json`), `${JSON.stringify(data, null, 2)}\n`);
}

function localStore(userId: string): WorkspaceStore {
  const base = getLocalDevBrand();
  const merge = (patch: BrandPatch): BrandInfo => ({
    id: base.id,
    name: patch.name ?? base.name,
    category: patch.category ?? base.category ?? null,
    short_description: patch.short_description ?? base.short_description ?? null,
    target_audience: patch.target_audience ?? null,
    city: patch.city ?? null,
    differentiators: patch.differentiators ?? null,
  });

  return {
    async getBrand() {
      return merge((await readLocal(userId)).brand);
    },
    async updateBrand(patch) {
      const data = await readLocal(userId);
      data.brand = { ...data.brand, ...patch };
      await writeLocal(userId, data);
      return merge(data.brand);
    },
    async listPosts() {
      const data = await readLocal(userId);
      return [...data.posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async getPost(id) {
      return (await readLocal(userId)).posts.find((p) => p.id === id) ?? null;
    },
    async insertPost(row) {
      const data = await readLocal(userId);
      const post: PostRow = {
        id: crypto.randomUUID(),
        user_id: userId,
        brand_id: base.id,
        title: null,
        copy: null,
        hashtags: null,
        call_to_action: null,
        visual_idea: null,
        image_url: null,
        status: "draft",
        scheduled_date: null,
        published_at: null,
        last_publish_error: null,
        created_at: new Date().toISOString(),
        ...row,
      };
      data.posts.push(post);
      await writeLocal(userId, data);
      return post;
    },
    async updatePost(id, patch) {
      const data = await readLocal(userId);
      const idx = data.posts.findIndex((p) => p.id === id);
      if (idx < 0) return null;
      data.posts[idx] = { ...data.posts[idx], ...patch, id };
      await writeLocal(userId, data);
      return data.posts[idx];
    },
    async deletePost(id) {
      const data = await readLocal(userId);
      data.posts = data.posts.filter((p) => p.id !== id);
      await writeLocal(userId, data);
    },
    async listPhotoPaths() {
      try {
        const dir = path.join(MEDIA_ROOT, userId, "refs");
        const names = await readdir(dir);
        return names
          .filter((n) => /\.(png|jpe?g|webp)$/i.test(n))
          .sort()
          .reverse()
          .map((n) => `${userId}/refs/${n}`);
      } catch {
        return [];
      }
    },
  };
}

function cloudStore(sb: any, userId: string, brandId: string | null): WorkspaceStore {
  return {
    async getBrand() {
      if (!brandId) {
        return { id: null, name: "Afacerea mea", category: null, short_description: null, target_audience: null, city: null, differentiators: null };
      }
      const { data, error } = await sb.from("brands").select(BRAND_COLS).eq("id", brandId).maybeSingle();
      if (error || !data) throw new Error("Brand inexistent sau fără acces.");
      return data as BrandInfo;
    },
    async updateBrand(patch) {
      if (!brandId) throw new Error("Nu ai niciun brand.");
      const { data, error } = await sb.from("brands").update(patch).eq("id", brandId).select(BRAND_COLS).maybeSingle();
      if (error) throw new Error(error.message);
      return data as BrandInfo;
    },
    async listPosts() {
      let q = sb.from("generated_posts").select(POST_COLS).eq("user_id", userId).order("created_at", { ascending: false }).limit(120);
      if (brandId) q = q.eq("brand_id", brandId);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as PostRow[];
    },
    async getPost(id) {
      const { data } = await sb.from("generated_posts").select(POST_COLS).eq("id", id).eq("user_id", userId).maybeSingle();
      return (data as PostRow) ?? null;
    },
    async insertPost(row) {
      const { data, error } = await sb
        .from("generated_posts")
        .insert({ platform: "both", status: "draft", ...row, user_id: userId, brand_id: brandId })
        .select(POST_COLS)
        .single();
      if (error || !data) throw new Error(error?.message ?? "Nu am putut salva postarea.");
      return data as PostRow;
    },
    async updatePost(id, patch) {
      const { data, error } = await sb.from("generated_posts").update(patch).eq("id", id).eq("user_id", userId).select(POST_COLS).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as PostRow) ?? null;
    },
    async deletePost(id) {
      await sb.from("publishing_jobs").update({ status: "cancelled" }).eq("post_id", id).eq("status", "pending");
      const { error } = await sb.from("generated_posts").delete().eq("id", id).eq("user_id", userId);
      if (error) throw new Error(error.message);
    },
    async listPhotoPaths() {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin.storage
          .from("post-images")
          .list(`${userId}/refs`, { limit: 60, sortBy: { column: "created_at", order: "desc" } });
        return (data ?? []).filter((f: any) => f.name && /\.(png|jpe?g|webp)$/i.test(f.name)).map((f: any) => `${userId}/refs/${f.name}`);
      } catch {
        return [];
      }
    },
  };
}

export async function getWorkspaceStore(sb: any, userId: string): Promise<WorkspaceStore> {
  if (userId === LOCAL_DEV_USER_ID) return localStore(userId);
  const { resolveBrandId } = await import("./brand-context.server");
  const brandId = await resolveBrandId(sb, userId);
  return cloudStore(sb, userId, brandId);
}

export function isVideoPath(p: string | null | undefined) {
  return !!p && /\.(mp4|mov|webm)$/i.test(p);
}

/** URL redabil în browser pentru un path din storage (local sau Supabase semnat). */
export async function mediaUrlFor(relPath: string | null): Promise<string | null> {
  if (!relPath) return null;
  if (/^https?:\/\//.test(relPath)) return relPath;
  const { isLocalMediaMode, localMediaPublicUrl, localMediaAbsolutePath } = await import("./local-media.server");
  try {
    await access(localMediaAbsolutePath(relPath));
    return localMediaPublicUrl(relPath);
  } catch {
    if (isLocalMediaMode()) return null;
  }
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.storage.from("post-images").createSignedUrl(relPath, 60 * 60 * 24 * 7);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

export async function deleteLocalPhoto(relPath: string) {
  const { localMediaAbsolutePath } = await import("./local-media.server");
  try {
    await unlink(localMediaAbsolutePath(relPath));
  } catch {
    /* already gone */
  }
}
