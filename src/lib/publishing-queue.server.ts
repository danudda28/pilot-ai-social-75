/** Publishing queue: idempotent jobs per (post, target) with retries + backoff. Server only. */
const BACKOFF_MIN = [1, 5, 15];

export function friendlyMetaError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("session has expired") || m.includes("error validating access token") || m.includes("token")) return "Conexiunea cu Facebook a expirat. Reconectează pagina din Integrări.";
  if (m.includes("permission") || m.includes("(#200)") || m.includes("(#10)")) return "Lipsește o permisiune Meta pentru această acțiune. Reconectează pagina și acceptă toate permisiunile.";
  if (m.includes("instagram necesită imagine")) return "Instagram acceptă doar postări cu imagine. Adaugă o imagine.";
  if (m.includes("fără cont ig") || m.includes("nu există cont ig")) return "Pagina nu are un cont Instagram Business legat.";
  if (m.includes("rate") || m.includes("(#4)") || m.includes("(#32)")) return "Meta limitează temporar publicările. Reîncercăm automat.";
  if (m.includes("image") || m.includes("media")) return "Imaginea nu a putut fi preluată de Meta. Verifică formatul (JPG/PNG).";
  return msg.length > 200 ? msg.slice(0, 200) + "…" : msg;
}

function isPermanent(msg: string) {
  const m = msg.toLowerCase();
  return m.includes("instagram necesită imagine") || m.includes("fără cont ig") || m.includes("conexiune lipsă");
}

export async function enqueueJobs(admin: any, post: { id: string; user_id: string; brand_id: string | null }, targets: string[], runAt: string) {
  const rows = targets.map(t => {
    const [connId, kind] = t.split(":");
    return { post_id: post.id, user_id: post.user_id, brand_id: post.brand_id, connection_id: connId, target: t, kind, status: "pending", attempts: 0, run_at: runAt, next_attempt_at: runAt, last_error: null };
  });
  // Don't reset jobs that already published (idempotency).
  const { data: existing } = await admin.from("publishing_jobs").select("target,status").eq("post_id", post.id);
  const done = new Set((existing ?? []).filter((e: any) => e.status === "published").map((e: any) => e.target));
  const toUpsert = rows.filter(r => !done.has(r.target));
  if (toUpsert.length) {
    const { error } = await admin.from("publishing_jobs").upsert(toUpsert, { onConflict: "post_id,target" });
    if (error) throw new Error(error.message);
  }
  // cancel jobs for targets no longer selected
  const keep = targets;
  const stale = (existing ?? []).filter((e: any) => !keep.includes(e.target) && e.status === "pending").map((e: any) => e.target);
  if (stale.length) await admin.from("publishing_jobs").update({ status: "cancelled" }).eq("post_id", post.id).in("target", stale);
}

async function signedImage(admin: any, path: string | null) {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  const { data } = await admin.storage.from("post-images").createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl as string | undefined;
}

async function recordHealth(admin: any, connId: string, userId: string, ok: boolean, err?: string) {
  const now = new Date().toISOString();
  const patch: any = { connection_id: connId, user_id: userId, updated_at: now };
  if (ok) patch.last_success_at = now; else { patch.last_failure_at = now; patch.last_error = err ?? null; }
  await admin.from("social_connection_health").upsert(patch, { onConflict: "connection_id" });
}

/** Processes due jobs. Optionally limited to a single post (immediate publish). */
export async function processJobs(admin: any, opts: { postId?: string; limit?: number } = {}) {
  const { publishToFacebookPage, publishToInstagram } = await import("./meta.server");
  const { logError } = await import("./observability.server");
  // Recuperează joburile blocate în "processing" de >10 minute (worker căzut) înapoi în "pending".
  const stuckBefore = new Date(Date.now() - 10 * 60000).toISOString();
  await admin.from("publishing_jobs").update({ status: "pending" })
    .eq("status", "processing").lt("updated_at", stuckBefore);
  let q = admin.from("publishing_jobs").select("*").eq("status", "pending").lte("next_attempt_at", new Date().toISOString()).order("next_attempt_at").limit(opts.limit ?? 25);
  if (opts.postId) q = q.eq("post_id", opts.postId);
  const { data: jobs, error } = await q;
  if (error) throw new Error(error.message);

  const results: { target: string; post_id: string; ok: boolean; error?: string; id?: string }[] = [];
  const touched = new Set<string>();

  for (const job of jobs ?? []) {
    // claim (avoid double publish)
    const { data: claimed } = await admin.from("publishing_jobs").update({ status: "processing", attempts: job.attempts + 1 })
      .eq("id", job.id).eq("status", "pending").select("id").maybeSingle();
    if (!claimed) continue;
    touched.add(job.post_id);
    try {
      const [{ data: post }, { data: conn }] = await Promise.all([
        admin.from("generated_posts").select("title,copy,short_copy,hashtags,call_to_action,image_url").eq("id", job.post_id).maybeSingle(),
        admin.from("meta_connections").select("id,page_id,page_access_token,ig_business_id").eq("id", job.connection_id).eq("user_id", job.user_id).maybeSingle(),
      ]);
      if (!post) throw new Error("Postarea nu mai există.");
      if (!conn) throw new Error("conexiune lipsă");
      const text = [post.title, post.copy ?? post.short_copy, post.hashtags, post.call_to_action].filter(Boolean).map((s: string) => s.trim()).join("\n\n");
      const imageUrl = await signedImage(admin, post.image_url);
      let r: { id: string };
      if (job.kind === "fb") {
        r = await publishToFacebookPage({ pageId: conn.page_id, pageAccessToken: conn.page_access_token, message: text, imageUrl });
      } else {
        if (!conn.ig_business_id) throw new Error("Fără cont IG Business.");
        if (!imageUrl) throw new Error("Instagram necesită imagine.");
        r = await publishToInstagram({ igBusinessId: conn.ig_business_id, pageAccessToken: conn.page_access_token, imageUrl, caption: text });
      }
      await admin.from("publishing_jobs").update({ status: "published", external_id: r.id, published_at: new Date().toISOString(), last_error: null }).eq("id", job.id);
      await recordHealth(admin, job.connection_id, job.user_id, true);
      results.push({ target: job.target, post_id: job.post_id, ok: true, id: r.id });
    } catch (e: any) {
      const raw = e?.message ?? "eroare";
      const friendly = friendlyMetaError(raw);
      const attempts = job.attempts + 1;
      const final = isPermanent(raw) || attempts >= job.max_attempts;
      const next = new Date(Date.now() + (BACKOFF_MIN[attempts - 1] ?? 15) * 60000).toISOString();
      await admin.from("publishing_jobs").update({ status: final ? "failed" : "pending", last_error: friendly, next_attempt_at: next }).eq("id", job.id);
      if (job.connection_id && raw !== "conexiune lipsă") await recordHealth(admin, job.connection_id, job.user_id, false, friendly);
      if (final) await logError(admin, "publishing", friendly, { job_id: job.id, target: job.target, attempts }, job.brand_id);
      results.push({ target: job.target, post_id: job.post_id, ok: false, error: final ? friendly : `${friendly} (reîncercăm automat)` });
    }
  }

  for (const postId of touched) await syncPostStatus(admin, postId);
  return results;
}

/** Repune în coadă toate joburile eșuate ale unei postări (retry manual din UI/admin). */
export async function retryFailedJobs(admin: any, postId: string) {
  const now = new Date().toISOString();
  const { data, error } = await admin.from("publishing_jobs")
    .update({ status: "pending", attempts: 0, next_attempt_at: now, last_error: null })
    .eq("post_id", postId).eq("status", "failed").select("id");
  if (error) throw new Error(error.message);
  if (data?.length) await syncPostStatus(admin, postId);
  return { retried: data?.length ?? 0 };
}

/** Derives generated_posts.status from its jobs. */
export async function syncPostStatus(admin: any, postId: string) {
  const { data: jobs } = await admin.from("publishing_jobs").select("status,last_error,published_at").eq("post_id", postId).neq("status", "cancelled");
  if (!jobs?.length) return;
  const anyPending = jobs.some((j: any) => j.status === "pending" || j.status === "processing");
  const published = jobs.filter((j: any) => j.status === "published");
  const errors = jobs.filter((j: any) => j.last_error && j.status !== "published").map((j: any) => j.last_error);
  const patch: any = { last_publish_error: errors.length ? Array.from(new Set(errors)).join(" | ") : null };
  if (!anyPending) {
    patch.status = published.length ? "published" : "failed";
    if (published.length) patch.published_at = published[0].published_at;
  }
  await admin.from("generated_posts").update(patch).eq("id", postId);
}
