import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type WorkspacePost = {
  id: string;
  kind: "video" | "image";
  state: "creating" | "ready" | "failed";
  title: string;
  caption: string;
  hashtags: string;
  mediaPath: string | null;
  mediaUrl: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  error: string | null;
  createdAt: string;
};

export type WorkspacePhoto = { path: string; url: string };

export type ChatAction =
  | "none"
  | "ask_photo"
  | "create_demo"
  | "create_video"
  | "create_images"
  | "edit_video"
  | "edit_image"
  | "delete_photo"
  | "connect_facebook";

const VIDEO_STALE_MS = 20 * 60_000;

function friendlyAiError(e: unknown): Error {
  const msg = e instanceof Error ? e.message : String(e);
  if (/\b402\b|prepayment|credits are depleted|billing/i.test(msg)) {
    return new Error("Creditele AI s-au terminat momentan. Reîncarcă soldul în Google AI Studio și reîncearcă.");
  }
  if (/\b429\b|quota|rate/i.test(msg)) return new Error("Prea multe cereri către AI chiar acum. Reîncearcă în câteva secunde.");
  if (/\b5\d\d\b|unavailable|overloaded/i.test(msg)) return new Error("Serviciul AI e temporar indisponibil. Reîncearcă imediat.");
  return new Error(msg.length > 220 ? `${msg.slice(0, 220)}…` : msg);
}

async function aiText(prompt: string): Promise<string> {
  const { getGeminiApiKey, generateGeminiText } = await import("./gemini.server");
  if (getGeminiApiKey()) {
    try {
      return await generateGeminiText(prompt);
    } catch (e) {
      throw friendlyAiError(e);
    }
  }
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Lipsește cheia AI (GEMINI_API_KEY sau LOVABLE_API_KEY).");
  const { generateText } = await import("ai");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const out = await generateText({ model: createLovableAiGatewayProvider(apiKey)("google/gemini-2.5-flash"), prompt });
  return out.text;
}

async function aiJson<T>(prompt: string): Promise<T> {
  const { parseJson } = await import("./brand-context.server");
  return parseJson<T>(await aiText(prompt));
}

async function toClientPost(row: import("./workspace-store.server").PostRow): Promise<WorkspacePost> {
  const { isVideoPath, mediaUrlFor } = await import("./workspace-store.server");
  const isVideo = row.content_type === "reels" || isVideoPath(row.image_url);
  const age = Date.now() - new Date(row.created_at).getTime();
  const missing = !row.image_url;
  return {
    id: row.id,
    kind: isVideo ? "video" : "image",
    state: missing ? (age > VIDEO_STALE_MS ? "failed" : "creating") : "ready",
    title: row.title ?? "",
    caption: row.copy ?? "",
    hashtags: row.hashtags ?? "",
    mediaPath: row.image_url,
    mediaUrl: await mediaUrlFor(row.image_url),
    status: row.status,
    scheduledAt: row.scheduled_date,
    publishedAt: row.published_at,
    error: row.last_publish_error,
    createdAt: row.created_at,
  };
}

/** Context de brand: profilul de bază + (cloud) datele confirmate din Brand Brain. */
async function brandBlock(sb: any, userId: string, brand: import("./workspace-store.server").BrandInfo) {
  const basics = `<profil>${JSON.stringify(brand)}</profil>`;
  if (!brand.id || userId.startsWith("00000000-")) return basics;
  try {
    const { loadBrandContext, brandContextBlock } = await import("./brand-context.server");
    return `${basics}\n${brandContextBlock(await loadBrandContext(sb, brand.id))}`;
  } catch {
    return basics;
  }
}

async function loadProfile(sb: any, userId: string) {
  const { data } = await sb.from("users_profiles").select("posts_remaining,subscription_plan,subscription_status").eq("user_id", userId).maybeSingle();
  return {
    remaining: (data?.posts_remaining as number | undefined) ?? 0,
    plan: (data?.subscription_plan as string | undefined) ?? "free",
  };
}

export const getWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getWorkspaceStore, mediaUrlFor } = await import("./workspace-store.server");
    const store = await getWorkspaceStore(context.supabase, context.userId);
    const [brand, rows, photoPaths, profile] = await Promise.all([
      store.getBrand(),
      store.listPosts(),
      store.listPhotoPaths(),
      loadProfile(context.supabase, context.userId),
    ]);
    const posts = await Promise.all(rows.map(toClientPost));
    const photos = (
      await Promise.all(photoPaths.slice(0, 40).map(async (p) => ({ path: p, url: await mediaUrlFor(p) })))
    ).filter((p): p is WorkspacePhoto => !!p.url);

    let targets: { target_id: string; platform: "facebook" | "instagram"; account_name: string }[] = [];
    const { data: conns } = await context.supabase
      .from("meta_connections")
      .select("id,page_name,ig_business_id,ig_username")
      .eq("user_id", context.userId);
    for (const c of conns ?? []) {
      targets.push({ target_id: `${c.id}:fb`, platform: "facebook", account_name: c.page_name });
      if (c.ig_business_id) targets.push({ target_id: `${c.id}:ig`, platform: "instagram", account_name: c.ig_username ?? "Instagram" });
    }
    targets = targets.filter((t) => t.account_name);

    return {
      brand,
      hasProfile: !!brand.short_description,
      posts,
      photos,
      targets,
      plan: profile.plan,
      isFree: !profile.plan || profile.plan === "free",
      remaining: profile.remaining,
    };
  });

const historySchema = z.array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) })).max(20);

export const workspaceChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      message: z.string().min(1).max(2000),
      event: z.enum(["message", "photo_added"]).optional(),
      history: historySchema.optional(),
      photoCount: z.number().int().min(0).max(500),
      postCount: z.number().int().min(0).max(5000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { getWorkspaceStore } = await import("./workspace-store.server");
    const store = await getWorkspaceStore(context.supabase, context.userId);
    const brand = await store.getBrand();
    const { RO_TEXT_QUALITY } = await import("./identity-lock.server");

    const history = (data.history ?? []).map((h) => `${h.role === "user" ? "CLIENT" : "SPARK"}: ${h.text}`).join("\n");
    const event =
      data.event === "photo_added"
        ? "EVENIMENT: clientul tocmai a încărcat o poză nouă (produs/locație/serviciu)."
        : `MESAJ CLIENT: ${data.message}`;

    const prompt = `Ești Spark, social media managerul AI al unei afaceri din România. Vorbești ca un om: cald, scurt (max 3 propoziții), la „tu”, în română corectă cu diacritice. Nu promite lucruri pe care nu le poți face. Nu faci reclame plătite.

CE POȚI FACE: înveți afacerea din chat, creezi reels video și postări foto din pozele clientului, scrii descrierile, le editezi la cerere, le programezi și le publici automat pe Facebook (și Instagram dacă e conectat).

STARE
- Profil afacere salvat: ${brand.short_description ? "DA" : "NU"}
${await brandBlock(context.supabase, context.userId, brand)}
- Poze încărcate: ${data.photoCount}
- Postări create: ${data.postCount}

FLUX (urmează-l):
1. Dacă profilul nu e salvat: cere o descriere scurtă a afacerii (ce vinde, unde, pentru cine).
2. Când clientul descrie afacerea: extrage profilul în "profile" (doar ce a spus EXPLICIT, nu inventa), confirmă pe scurt ce ai reținut. Dacă nu are poze, action="ask_photo" și cere o poză cu produsul/locația (cu agrafa de sub chat).
3. După ce are profil + cel puțin o poză și nu are postări: propune primul pachet (1 reel + 2 poze) și întreabă dacă începi. Când confirmă → action="create_demo".
4. Cereri ulterioare: „încă un video/reel” → create_video; „mai multe poze/imagini/postări” → create_images (count 1-4); modificări la un video → edit_video; la o imagine → edit_image (pune modificarea exactă în "instruction"); ștergere poză → delete_photo; conectare Facebook/Instagram/publicare când nu e conectat → connect_facebook.
5. Întrebări generale → răspunde util, action="none".
Pentru create_video/create_images pune în "instruction" orice cerință specifică a clientului (ofertă, temă, stil), altfel string gol.

${RO_TEXT_QUALITY}

ISTORIC RECENT
${history || "(început de conversație)"}

${event}

Răspunde STRICT cu JSON valid:
{"reply":"...","profile":null sau {"name":"","category":"","short_description":"max 280 caractere","target_audience":"","city":"","differentiators":""},"action":"none|ask_photo|create_demo|create_video|create_images|edit_video|edit_image|delete_photo|connect_facebook","count":0,"instruction":""}`;

    const out = await aiJson<{
      reply?: string;
      profile?: Record<string, string> | null;
      action?: ChatAction;
      count?: number;
      instruction?: string;
    }>(prompt);

    let profileUpdated = false;
    if (out.profile && typeof out.profile === "object") {
      const allowed = ["name", "category", "short_description", "target_audience", "city", "differentiators"] as const;
      const patch: Record<string, string> = {};
      for (const k of allowed) {
        const v = out.profile[k];
        if (typeof v === "string" && v.trim()) patch[k] = v.trim().slice(0, k === "short_description" ? 300 : 200);
      }
      if (Object.keys(patch).length) {
        await store.updateBrand(patch);
        profileUpdated = true;
      }
    }

    const actions: ChatAction[] = ["none", "ask_photo", "create_demo", "create_video", "create_images", "edit_video", "edit_image", "delete_photo", "connect_facebook"];
    return {
      reply: (out.reply ?? "").trim() || "Spune-mi mai multe despre afacerea ta.",
      profileUpdated,
      action: actions.includes(out.action as ChatAction) ? (out.action as ChatAction) : "none",
      count: Math.max(1, Math.min(4, Number(out.count) || 2)),
      instruction: (out.instruction ?? "").slice(0, 500),
    };
  });

type Concept = {
  title: string;
  caption: string;
  hashtags: string;
  cta: string;
  visual: string;
  hook?: string;
  scenes?: string[];
};

export const workspaceGenerate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      mode: z.enum(["demo", "video", "images"]),
      count: z.number().int().min(1).max(4).optional(),
      instruction: z.string().max(500).optional(),
      referencePath: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { getWorkspaceStore } = await import("./workspace-store.server");
    const store = await getWorkspaceStore(context.supabase, context.userId);
    const [brand, photoPaths, profile] = await Promise.all([store.getBrand(), store.listPhotoPaths(), loadProfile(context.supabase, context.userId)]);

    const videos = data.mode === "images" ? 0 : 1;
    const images = data.mode === "video" ? 0 : data.mode === "demo" ? 2 : (data.count ?? 2);
    const total = videos + images;
    if (profile.remaining < total) {
      throw new Error(`Nu mai ai generări disponibile în planul ${profile.plan.toUpperCase()}. Fă upgrade ca să continui.`);
    }

    const { checkAiDailyLimit } = await import("./observability.server");
    await checkAiDailyLimit(context.supabase, context.userId, profile.plan);

    const refPath = data.referencePath && data.referencePath.startsWith(`${context.userId}/`) ? data.referencePath : photoPaths[0];
    const { COPY_RO_RULES, RO_TEXT_QUALITY, COPY_REF_RULES, buildLockedImagePrompt } = await import("./identity-lock.server");
    const { BRAND_RULES } = await import("./brand-context.server");

    const prompt = `Ești copywriter senior de social media în România. Creează ${total} postări DIFERITE pentru afacerea de mai jos: ${videos ? "prima e un REEL video (are hook + scene), " : ""}${images ? `${images} sunt postări foto` : ""}.

${COPY_RO_RULES}
${RO_TEXT_QUALITY}
${refPath ? COPY_REF_RULES : ""}
${BRAND_RULES}

${await brandBlock(context.supabase, context.userId, brand)}
${data.instruction ? `CERINȚA CLIENTULUI: ${data.instruction}` : ""}
${refPath ? "Clientul are o poză reală cu produsul/locația — vizualurile o păstrează identic." : ""}

Răspunde STRICT cu JSON valid:
{"posts":[{"title":"max 60 caractere","caption":"descriere completă, paragrafe cu \\n\\n, emoji moderate, CTA la final","hashtags":"#tag1 #tag2 ... (5-8)","cta":"CTA scurt","visual":"englză: doar decor, lumină, unghi, oameni — nu redesena produsul","hook":"doar pentru reel: hook 3s în română","scenes":["doar pentru reel: 3-4 momente scurte în română"]}]}`;

    const parsed = await aiJson<{ posts?: Concept[] }>(prompt);
    const concepts = (parsed.posts ?? []).slice(0, total);
    if (concepts.length < total) throw new Error("AI nu a returnat suficiente idei. Reîncearcă.");

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { logAiUsage } = await import("./observability.server");
      await logAiUsage(supabaseAdmin, { brandId: brand.id, userId: context.userId, feature: "workspace_generate", model: "gemini-text" });
    } catch {
      /* local fără SERVICE_ROLE */
    }

    const { loadMediaBytes, guessMimeFromPath, storeMediaBytes } = await import("./local-media.server");
    let reference: { bytes: Uint8Array; mimeType: string } | undefined;
    if (refPath) {
      const bytes = await loadMediaBytes(refPath);
      if (bytes) reference = { bytes, mimeType: guessMimeFromPath(refPath) };
    }

    const created: WorkspacePost[] = [];
    const videoPostIds: string[] = [];

    for (let i = 0; i < videos; i++) {
      const c = concepts[i];
      const row = await store.insertPost({
        content_type: "reels",
        title: c.title,
        copy: c.caption,
        hashtags: c.hashtags,
        call_to_action: c.cta,
        visual_idea: JSON.stringify({ visual: c.visual, hook: c.hook ?? "", scenes: c.scenes ?? [], ref: refPath ?? null, instruction: data.instruction ?? "" }),
      });
      videoPostIds.push(row.id);
      created.push(await toClientPost(row));
    }

    const { getGeminiApiKey, generateGeminiImage } = await import("./gemini.server");
    if (images && !getGeminiApiKey()) throw new Error("Lipsește GEMINI_API_KEY pentru generarea de imagini.");
    let lastImageError: unknown = null;

    for (let i = videos; i < concepts.length; i++) {
      const c = concepts[i];
      const row = await store.insertPost({
        content_type: "static",
        title: c.title,
        copy: c.caption,
        hashtags: c.hashtags,
        call_to_action: c.cta,
        visual_idea: c.visual,
      });
      try {
        const bytes = await generateGeminiImage(
          buildLockedImagePrompt({
            brief: `${brand.name}: ${brand.short_description ?? ""}. ${data.instruction ?? ""}`,
            angle: c.visual,
            visualIdea: c.title,
            hasReference: !!reference,
            aspect: "1:1",
          }),
          { aspectRatio: "1:1", reference },
        );
        const stored = await storeMediaBytes(`${context.userId}/posts/${row.id}-${Date.now()}.png`, bytes, "image/png");
        const updated = await store.updatePost(row.id, { image_url: stored.path });
        created.push(await toClientPost(updated ?? row));
      } catch (e) {
        console.error("[workspace image]", e);
        lastImageError = e;
        await store.deletePost(row.id);
      }
    }

    if (images && !created.some((p) => p.kind === "image") && !videoPostIds.length) {
      throw friendlyAiError(lastImageError ?? "Imaginile nu au putut fi generate.");
    }

    const made = created.length;
    if (made && !context.userId.startsWith("00000000-")) {
      await context.supabase
        .from("users_profiles")
        .update({ posts_remaining: Math.max(0, profile.remaining - made) })
        .eq("user_id", context.userId);
    }

    return { posts: created, videoPostIds };
  });

/** Randează (sau re-randează cu modificări) reelul unei postări. Clipul se salvează pe disc înainte de orice alt pas. */
export const workspaceRenderVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ postId: z.string().uuid(), instruction: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { getWorkspaceStore } = await import("./workspace-store.server");
    const store = await getWorkspaceStore(context.supabase, context.userId);
    const post = await store.getPost(data.postId);
    if (!post) throw new Error("Postare inexistentă.");
    const brand = await store.getBrand();

    let meta: { visual?: string; hook?: string; scenes?: string[]; ref?: string | null; instruction?: string } = {};
    try {
      meta = JSON.parse(post.visual_idea ?? "{}");
    } catch {
      meta = { visual: post.visual_idea ?? "" };
    }

    const { loadMediaBytes, guessMimeFromPath, storeMediaBytes } = await import("./local-media.server");
    let reference: { bytes: Uint8Array; mimeType: string } | undefined;
    if (meta.ref && meta.ref.startsWith(`${context.userId}/`)) {
      const bytes = await loadMediaBytes(meta.ref);
      if (bytes) reference = { bytes, mimeType: guessMimeFromPath(meta.ref) };
    }

    const { buildLockedOmniPrompt, NATURAL_RO_VOICE } = await import("./identity-lock.server");
    const { sanitizeOmniPrompt } = await import("./omni-prompt.server");
    const { generateAndPersistGeminiVideo, getGeminiApiKey } = await import("./gemini.server");
    if (!getGeminiApiKey()) throw new Error("Lipsește GEMINI_API_KEY pentru video.");

    const prompt = sanitizeOmniPrompt(
      [
        buildLockedOmniPrompt({
          brief: `${brand.name}: ${brand.short_description ?? ""}. ${post.title ?? ""}. ${meta.instruction ?? ""}`,
          hook: meta.hook,
          scenes: meta.scenes,
          businessType: brand.category ?? undefined,
          hasReference: !!reference,
        }),
        meta.visual ? `Look & setting: ${meta.visual}` : "",
        `Voiceover in Romanian. ${NATURAL_RO_VOICE}`,
        data.instruction ? `CLIENT CHANGE REQUEST (apply exactly, keep everything else): ${data.instruction}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    const run = (withRef: boolean) =>
      generateAndPersistGeminiVideo(prompt, {
        aspectRatio: "9:16",
        persistUserId: context.userId,
        persistLabel: `ws-${data.postId.slice(0, 8)}`,
        ...(withRef && reference ? { task: "image_to_video" as const, image: reference } : {}),
      });

    let result;
    let note: string | null = null;
    try {
      result = await run(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!reference || !/content_blocked|likeness|real people|names/i.test(msg)) throw friendlyAiError(e);
      result = await run(false).catch((err) => {
        throw friendlyAiError(err);
      });
      note = "Google a refuzat poza ca referință, așa că am creat clipul doar din descriere. Verifică dacă produsul arată corect.";
    }

    const stored = await storeMediaBytes(`${context.userId}/posts/${data.postId}-${Date.now()}.mp4`, result.bytes, "video/mp4");
    const updated = await store.updatePost(data.postId, {
      image_url: stored.path,
      visual_idea: JSON.stringify({ ...meta, instruction: [meta.instruction, data.instruction].filter(Boolean).join(" · ") }),
    });
    return { post: await toClientPost(updated ?? { ...post, image_url: stored.path }), note };
  });

export const workspaceEditImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid(), instruction: z.string().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { getWorkspaceStore, isVideoPath } = await import("./workspace-store.server");
    const store = await getWorkspaceStore(context.supabase, context.userId);
    const post = await store.getPost(data.postId);
    if (!post?.image_url || isVideoPath(post.image_url)) throw new Error("Postarea nu are o imagine de editat.");

    const { loadMediaBytes, guessMimeFromPath, storeMediaBytes } = await import("./local-media.server");
    const current = await loadMediaBytes(post.image_url);
    if (!current) throw new Error("Nu găsesc imaginea originală.");

    const { RO_TEXT_QUALITY } = await import("./identity-lock.server");
    const { generateGeminiImage } = await import("./gemini.server");
    const bytes = await generateGeminiImage(
      [
        "Edit the attached image. Apply ONLY the requested change; keep composition, product, labels, logos and everything else identical.",
        `Requested change (Romanian): ${data.instruction}`,
        RO_TEXT_QUALITY,
      ].join("\n"),
      { aspectRatio: "1:1", reference: { bytes: current, mimeType: guessMimeFromPath(post.image_url) } },
    ).catch((e) => {
      throw friendlyAiError(e);
    });
    const stored = await storeMediaBytes(`${context.userId}/posts/${post.id}-${Date.now()}.png`, bytes, "image/png");
    const updated = await store.updatePost(post.id, { image_url: stored.path });
    return { post: await toClientPost(updated ?? post) };
  });

export const workspaceUpdatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      postId: z.string().uuid(),
      caption: z.string().max(5000).optional(),
      hashtags: z.string().max(1000).optional(),
      title: z.string().max(200).optional(),
      plannedAt: z.string().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { getWorkspaceStore } = await import("./workspace-store.server");
    const store = await getWorkspaceStore(context.supabase, context.userId);
    const patch: Record<string, unknown> = {};
    if (data.caption !== undefined) patch.copy = data.caption;
    if (data.hashtags !== undefined) patch.hashtags = data.hashtags;
    if (data.title !== undefined) patch.title = data.title;
    if (data.plannedAt !== undefined) {
      if (data.plannedAt && isNaN(new Date(data.plannedAt).getTime())) throw new Error("Dată invalidă.");
      patch.scheduled_date = data.plannedAt ? new Date(data.plannedAt).toISOString() : null;
    }
    const updated = await store.updatePost(data.postId, patch);
    if (!updated) throw new Error("Postare inexistentă.");
    return { post: await toClientPost(updated) };
  });

export const workspaceDeletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { getWorkspaceStore } = await import("./workspace-store.server");
    const store = await getWorkspaceStore(context.supabase, context.userId);
    await store.deletePost(data.postId);
    return { ok: true as const };
  });

export const workspaceDeletePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/refs/`)) throw new Error("Acces interzis.");
    const { deleteLocalPhoto } = await import("./workspace-store.server");
    await deleteLocalPhoto(data.path);
    const { isLocalMediaMode } = await import("./local-media.server");
    if (!isLocalMediaMode()) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("post-images").remove([data.path]);
    }
    return { ok: true as const };
  });
