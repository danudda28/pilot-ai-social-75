import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), "public", "local-media");

/** Fără SERVICE_ROLE → tot media-ul merge pe disc local (dev / cont demo). */
export function isLocalMediaMode() {
  return !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

function safeRel(relPath: string) {
  const cleaned = relPath.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!cleaned || cleaned.includes("..")) throw new Error("Path media invalid.");
  return cleaned;
}

export function localMediaPublicUrl(relPath: string) {
  return `/local-media/${safeRel(relPath)}`;
}

export function localMediaAbsolutePath(relPath: string) {
  const rel = safeRel(relPath);
  return path.join(ROOT, ...rel.split("/"));
}

export async function saveLocalMedia(
  relPath: string,
  bytes: Uint8Array,
  _contentType?: string,
) {
  const rel = safeRel(relPath);
  const full = path.join(ROOT, ...rel.split("/"));
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes);
  return { path: rel, publicUrl: localMediaPublicUrl(rel), absolutePath: full };
}

/**
 * Salvare OBLIGATORIE pe disc pentru clipuri plătite (Omni).
 * Rulează mereu, indiferent de Supabase — ca să nu pierzi banii dacă cloud-ul crapă.
 */
export async function saveOmniClipLocal(
  userId: string,
  bytes: Uint8Array,
  meta?: { label?: string; interactionId?: string; prompt?: string },
) {
  if (!bytes?.length) throw new Error("Clip gol — nimic de salvat.");
  const stamp = Date.now();
  const label = (meta?.label ?? "omni")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48) || "omni";
  const base = `${safeRel(userId)}/omni/${stamp}-${label}`;
  const mp4Rel = `${base}.mp4`;
  const saved = await saveLocalMedia(mp4Rel, bytes, "video/mp4");

  const sidecar = {
    path: saved.path,
    url: saved.publicUrl,
    bytes: bytes.length,
    interactionId: meta?.interactionId ?? null,
    prompt: (meta?.prompt ?? "").slice(0, 800),
    savedAt: new Date().toISOString(),
  };
  await saveLocalMedia(
    `${base}.json`,
    new TextEncoder().encode(`${JSON.stringify(sidecar, null, 2)}\n`),
    "application/json",
  );

  console.info(`[local-media] Omni SALVAT: ${saved.publicUrl} (${bytes.length} bytes) → ${saved.absolutePath}`);
  return saved;
}

export async function readLocalMedia(relPath: string): Promise<Uint8Array | null> {
  try {
    const rel = safeRel(relPath);
    const full = path.join(ROOT, ...rel.split("/"));
    const buf = await readFile(full);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export function guessMimeFromPath(relPath: string) {
  const lower = relPath.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return "image/png";
}

/**
 * Upload unificat. Video → mereu pe disc local întâi (safety net pentru clipuri plătite).
 * Imagini în local mode → disc. Altfel Supabase.
 */
export async function storeMediaBytes(
  relPath: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<{ path: string; url: string }> {
  // Hosted servers have a read-only filesystem (EPERM), so disk is only for local mode.
  if (isLocalMediaMode()) {
    const saved = await saveLocalMedia(relPath, bytes, contentType);
    return { path: saved.path, url: saved.publicUrl };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage
    .from("post-images")
    .upload(relPath, bytes, { contentType, upsert: true });
  if (error) throw new Error(`Upload eșuat: ${error.message}`);
  const { data: signed, error: sErr } = await supabaseAdmin.storage
    .from("post-images")
    .createSignedUrl(relPath, 60 * 60 * 24 * 7);
  if (sErr || !signed?.signedUrl) throw new Error(sErr?.message ?? "Signed URL eșuat.");
  return { path: relPath, url: signed.signedUrl };
}

export async function loadMediaBytes(relPath: string): Promise<Uint8Array | null> {
  if (isLocalMediaMode() || relPath.startsWith("local-media/")) {
    const key = relPath.replace(/^local-media\//, "");
    return readLocalMedia(key);
  }
  // try local first (hybrid), then supabase
  const local = await readLocalMedia(relPath);
  if (local) return local;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return null;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.storage.from("post-images").download(relPath);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  } catch {
    return null;
  }
}
