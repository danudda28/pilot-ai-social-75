import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";

export type StudioKind = "image" | "reel" | "both";

const ETA_SEC: Record<StudioKind, { copy: number; image: number; reel: number }> = {
  image: { copy: 8, image: 22, reel: 0 },
  reel: { copy: 10, image: 18, reel: 40 },
  both: { copy: 10, image: 22, reel: 40 },
};

export function estimateSeconds(kind: StudioKind, variants: number) {
  const base = ETA_SEC[kind];
  const images = Math.max(1, variants) * (kind === "reel" ? base.image : base.image);
  const reel = kind === "image" ? 0 : base.reel;
  const copy = base.copy;
  return {
    totalSec: copy + images + reel,
    steps: [
      { id: "copy", label: "Scriu textul postării", sec: copy },
      { id: "image", label: `Generez ${variants} variante vizuale`, sec: images },
      ...(kind !== "image" ? [{ id: "reel", label: "Pregătesc scenariul de Reel", sec: reel }] : []),
    ],
  };
}

function detectKind(text: string, hasReference = false): StudioKind {
  const t = text.toLowerCase();
  // Explicit „doar poze”
  if (/(doar\s+poz|doar\s+foto|fără\s+video|fara\s+video|static\s+doar)/i.test(t)) return "image";
  const wantsVideo =
    /(reel|video|clip|filmare|ugc|demo|saas|sass|secunde|\d+\s*s\b|walkthrough|prezentare|screen\s*record)/i.test(
      t,
    );
  const wantsPhoto = /(poz[aă]|imagine|foto|poze|carousel)/i.test(t);
  if (wantsVideo && wantsPhoto) return "both";
  if (wantsVideo) return "reel";
  // Cu referință produs/UI: generăm și clip (altfel SaaS rămâne doar pe poze)
  if (hasReference) return "both";
  return "image";
}

function detectTone(text: string): "profesional" | "prietenos" | "premium" | "amuzant" | "direct" {
  const t = text.toLowerCase();
  if (/premium|lux|elegant/.test(t)) return "premium";
  if (/amuzant|haio|fun|glum/.test(t)) return "amuzant";
  if (/direct|clar|fără ocoliș/.test(t)) return "direct";
  if (/profesion/.test(t)) return "profesional";
  return "prietenos";
}

function detectGoal(text: string): "vanzare" | "awareness" | "promovare" | "educare" | "testimonial" {
  const t = text.toLowerCase();
  if (/ofert|reducere|promo|%\s|discount/.test(t)) return "promovare";
  if (/testimonial|recenzie|client/.test(t)) return "testimonial";
  if (/educ|cum să|sfat|ghid/.test(t)) return "educare";
  if (/vinde|cumpăr|rezerv|comand/.test(t)) return "vanzare";
  return "awareness";
}

async function genImageBytes(
  _apiKey: string,
  prompt: string,
  opts?: { aspectRatio?: "1:1" | "9:16"; reference?: { bytes: Uint8Array; mimeType: string } },
) {
  const { getGeminiApiKey, generateGeminiImage } = await import("./gemini.server");
  if (getGeminiApiKey()) {
    return generateGeminiImage(prompt, {
      aspectRatio: opts?.aspectRatio ?? "1:1",
      reference: opts?.reference,
    });
  }

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY (sau LOVABLE_API_KEY)");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-image-2",
      prompt,
      quality: "low",
      size: "1024x1024",
      n: 1,
    }),
  });
  if (!res.ok) {
    if (res.status === 402) throw new Error("Creditele AI s-au epuizat.");
    if (res.status === 429) throw new Error("Prea multe cereri. Reîncearcă în câteva secunde.");
    throw new Error(`Generare imagine eșuată: ${res.status}`);
  }
  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("AI nu a returnat imagine.");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const estimateStudioJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      brief: z.string().min(3).max(2000),
      kind: z.enum(["image", "reel", "both"]).optional(),
      variants: z.number().int().min(1).max(4).optional(),
      hasReference: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const kind = data.kind ?? detectKind(data.brief, !!data.hasReference);
    const variants = data.variants ?? (kind === "reel" ? 2 : 3);
    const eta = estimateSeconds(kind, variants);
    // Omni e separat (~30–90s) — nu blochează pozele
    const omniSec = kind === "image" ? 0 : 55;
    return {
      kind,
      variants,
      ...eta,
      omniSec,
      totalSec: eta.totalSec + omniSec,
      human: `Cam ${Math.max(1, Math.round((eta.totalSec + omniSec) / 60))} min · poze ~${eta.totalSec}s` +
        (omniSec ? ` + clip ~${omniSec}s` : ""),
    };
  });

export const uploadStudioReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      dataUrl: z.string().min(20),
      mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
      fileName: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const base64 = data.dataUrl.replace(/^data:[^;]+;base64,/, "");
    if (base64.length > 8_500_000) throw new Error("Fișier prea mare (max 6 MB).");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const ext = data.mimeType === "image/jpeg" ? "jpg" : data.mimeType === "image/webp" ? "webp" : "png";
    const path = `${context.userId}/refs/ref-${Date.now()}.${ext}`;
    const { storeMediaBytes } = await import("./local-media.server");
    const stored = await storeMediaBytes(path, bytes, data.mimeType);
    return {
      path: stored.path,
      signedUrl: stored.url,
      fileName: data.fileName ?? `referinta.${ext}`,
      local: stored.url.startsWith("/local-media/"),
    };
  });

export type StudioCandidate = {
  id: string;
  kind: "image" | "reel_frame" | "reel_video";
  label: string;
  path: string;
  signedUrl: string;
  angle: string;
};

export const runStudioCreate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      brief: z.string().min(8).max(2000),
      kind: z.enum(["image", "reel", "both"]).optional(),
      variants: z.number().int().min(1).max(4).optional(),
      referencePath: z.string().max(500).optional(),
      referenceNote: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { getGeminiApiKey } = await import("./gemini.server");
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey && !getGeminiApiKey()) {
      throw new Error("Missing GEMINI_API_KEY (sau LOVABLE_API_KEY)");
    }

    const kind = data.kind ?? detectKind(data.brief, !!data.referencePath);
    const variants = data.variants ?? (kind === "reel" ? 2 : 3);
    const tone = detectTone(data.brief);
    const goal = detectGoal(data.brief);

    const { data: profile } = await context.supabase
      .from("users_profiles")
      .select("posts_remaining,subscription_plan")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profile && (profile.posts_remaining ?? 0) <= 0) {
      throw new Error(`Limita planului ${profile.subscription_plan?.toUpperCase() ?? "FREE"} a fost atinsă.`);
    }

    const { checkAiDailyLimit, logAiUsage } = await import("./observability.server");
    await checkAiDailyLimit(context.supabase, context.userId, profile?.subscription_plan ?? "free");

    const { resolveBrandId, loadBrandContext, brandContextBlock, BRAND_RULES, findBannedWords } = await import("./brand-context.server");
    const brandId = await resolveBrandId(context.supabase, context.userId);
    const ctx = brandId ? await loadBrandContext(context.supabase, brandId).catch(() => null) : null;
    const businessType = ctx?.brand?.category || ctx?.brand?.name || "afacere locală";
    const domain = ctx?.brand?.category || "servicii";

    const { COPY_REF_RULES, COPY_RO_RULES, RO_TEXT_QUALITY } = await import("./identity-lock.server");
    const refNote = data.referencePath
      ? `Clientul a încărcat o REFERINȚĂ vizuală (${data.referenceNote || "produs/serviciu"}). Produsul sau locația/serviciul din referință trebuie păstrat 100% identic în orice vizual — nu inventa alt ambalaj, alt logo sau alt spațiu.`
      : "Clientul NU are referință vizuală. Rămâi fidel brief-ului verbal; nu inventa un brand/produs diferit.";

    const goalsRo: Record<string, string> = {
      vanzare: "vânzare directă",
      awareness: "creștere notorietate",
      promovare: "promovare ofertă",
      educare: "educare audiență",
      testimonial: "testimonial / social proof",
    };

    const prompt = `Ești un copywriter senior pentru social media în România. Scrie EXCLUSIV în română literară corectă, cu diacritice (ă, â, î, ș, ț). Zero greșeli gramaticale.

${COPY_RO_RULES}

${RO_TEXT_QUALITY}

CONTEXT
- Domeniu: ${domain}
- Tip afacere: ${businessType}
- Ton: ${tone}
- Obiectiv: ${goalsRo[goal]}
- Tip: ${kind === "image" ? "postare statică" : "reel + vizual"}
- Brief client: ${data.brief}
- ${refNote}
${data.referencePath ? `\n${COPY_REF_RULES}\n` : ""}
${ctx ? `\nBRAND BRAIN\n${BRAND_RULES}\n${brandContextBlock(ctx)}` : ""}

Răspunde STRICT cu JSON valid (toate stringurile pentru user în română corectă):
{
  "title": "max 60 caractere, română corectă",
  "copy": "postare completă cu \\n\\n, emoji moderate, CTA la final — română cu diacritice",
  "short_copy": "max 2 propoziții corecte",
  "hashtags": "#tag1 #tag2 ...",
  "visual_idea": "doar decor/lumină/unghi — NU redesena produsul din referință",
  "call_to_action": "CTA scurt în română",
  "image_angles": ["unghi 1", "unghi 2", "unghi 3"],
  "reel_hook": "hook 3s în română corectă sau string gol",
  "reel_scenes": [{"caption":"română corectă, max 70 caractere","imagePrompt":"english: environment + SAME product from reference","durationSec":4}]
}`;

    let text: string;
    let usage: unknown;
    const geminiKey = getGeminiApiKey();
    if (geminiKey && !apiKey) {
      const { generateGeminiText } = await import("./gemini.server");
      text = await generateGeminiText(prompt);
      usage = undefined;
    } else {
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(apiKey!);
      const out = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        prompt,
      });
      text = out.text;
      usage = out.usage;
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await logAiUsage(supabaseAdmin, {
        brandId,
        userId: context.userId,
        feature: "studio_create",
        model: "google/gemini-2.5-flash",
        usage: usage as any,
      });
    } catch {
      /* local fără SERVICE_ROLE — skip usage log */
    }

    let parsed: Record<string, any>;
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI a returnat un format invalid. Reîncearcă.");
    }

    const { data: inserted, error } = await context.supabase
      .from("generated_posts")
      .insert({
        user_id: context.userId,
        brand_id: brandId,
        platform: "both",
        content_type: kind === "image" ? "static" : "reels",
        title: parsed.title ?? null,
        copy: parsed.copy ?? null,
        short_copy: parsed.short_copy ?? null,
        hashtags: parsed.hashtags ?? null,
        visual_idea: parsed.visual_idea ?? null,
        call_to_action: parsed.call_to_action ?? null,
        status: "draft",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (!inserted?.id) throw new Error("Nu am putut salva postarea. Reîncearcă.");

    if (profile) {
      await context.supabase
        .from("users_profiles")
        .update({ posts_remaining: Math.max(0, (profile.posts_remaining ?? 0) - 1) })
        .eq("user_id", context.userId);
    }

    const angles: string[] = Array.isArray(parsed.image_angles) && parsed.image_angles.length
      ? parsed.image_angles.slice(0, variants)
      : [
          "close-up pe produs/serviciu, lumină naturală",
          "cadru ambiental în locație",
          "detaliu autentic, mâini la lucru",
        ].slice(0, variants);

    const candidates: StudioCandidate[] = [];
    const { storeMediaBytes, loadMediaBytes, guessMimeFromPath } = await import("./local-media.server");

    let reference: { bytes: Uint8Array; mimeType: string } | undefined;
    if (data.referencePath) {
      const refBytes = await loadMediaBytes(data.referencePath);
      if (refBytes) {
        reference = { bytes: refBytes, mimeType: guessMimeFromPath(data.referencePath) };
      }
    }

    const { buildLockedImagePrompt } = await import("./identity-lock.server");

    for (let i = 0; i < angles.length; i++) {
      try {
        const visualPrompt = buildLockedImagePrompt({
          brief: data.brief,
          angle: angles[i],
          visualIdea: parsed.visual_idea,
          hasReference: !!reference,
          aspect: "1:1",
        });
        const bytes = await genImageBytes(apiKey, visualPrompt, { aspectRatio: "1:1", reference });
        const path = `${context.userId}/${inserted.id}-v${i + 1}-${Date.now()}.png`;
        const stored = await storeMediaBytes(path, bytes, "image/png");
        candidates.push({
          id: `img-${i + 1}`,
          kind: "image",
          label: `Poză ${i + 1}`,
          path: stored.path,
          signedUrl: stored.url,
          angle: angles[i],
        });
      } catch {
        /* skip failed variant */
      }
    }

    let reel: null | {
      hook: string;
      scenes: { caption: string; imagePrompt: string; durationSec: number }[];
    } = null;
    let omniNote: string | null = null;

    if (kind !== "image" && Array.isArray(parsed.reel_scenes) && parsed.reel_scenes.length) {
      reel = {
        hook: parsed.reel_hook || parsed.title || "",
        scenes: parsed.reel_scenes.slice(0, 4).map((s: any) => ({
          caption: String(s.caption ?? ""),
          imagePrompt: String(s.imagePrompt ?? parsed.visual_idea ?? data.brief),
          durationSec: Number(s.durationSec) || 4,
        })),
      };

      try {
        const scene = reel.scenes[0];
        const bytes = await genImageBytes(
          apiKey,
          buildLockedImagePrompt({
            brief: data.brief,
            angle: scene.imagePrompt || reel.hook || "product close-up",
            visualIdea: scene.caption,
            hasReference: !!reference,
            aspect: "9:16",
            extra: "Keyframe still for a Reel. No new packaging.",
          }),
          { aspectRatio: "9:16", reference },
        );
        const path = `${context.userId}/${inserted.id}-reel-key-${Date.now()}.png`;
        const stored = await storeMediaBytes(path, bytes, "image/png");
        candidates.push({
          id: "reel-key",
          kind: "reel_frame",
          label: "Cadru Reel",
          path: stored.path,
          signedUrl: stored.url,
          angle: reel.hook || "Reel",
        });
      } catch {
        /* optional */
      }

      // Clip Omni = apel separat (runStudioOmniClip) ca să nu expire request-ul înainte să apară în UI
      omniNote =
        "Pozele sunt gata. Generez acum clipul Omni în fundal — apare mai jos în câteva zeci de secunde.";
    }

    if (candidates[0]) {
      await context.supabase
        .from("generated_posts")
        .update({ image_url: candidates[0].path })
        .eq("id", inserted.id)
        .eq("user_id", context.userId);
    }

    const bannedHits = ctx
      ? findBannedWords([parsed.title, parsed.copy, parsed.short_copy, parsed.call_to_action].filter(Boolean).join(" "), ctx.bannedWords)
      : [];

    const baseReply =
      candidates.length > 0
        ? `Gata. Am ${candidates.length} ${candidates.length === 1 ? "variantă" : "variante"} gata. Alege ce publicăm pe Facebook și Instagram — sau spune-mi ce să schimb.`
        : "Am scris textul, dar imaginile nu au putut fi generate acum. Reîncearcă sau încarcă o referință.";

    return {
      post: inserted,
      candidates,
      reel,
      kind,
      wantsOmni: kind !== "image",
      reply: omniNote ? `${baseReply}\n\n${omniNote}` : baseReply,
      warnings: { bannedWords: bannedHits, usedBrandBrain: !!ctx, omniNote },
    };
  });

/** Clip Omni separat — salvare locală obligatorie, nu blochează pozele. */
export const runStudioOmniClip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      postId: z.string().uuid(),
      brief: z.string().min(3).max(2000),
      hook: z.string().max(300).optional(),
      scenes: z.array(z.string().max(200)).max(8).optional(),
      referencePath: z.string().max(500).optional(),
      businessType: z.string().max(120).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { getGeminiApiKey, generateAndPersistGeminiVideo } = await import("./gemini.server");
    if (!getGeminiApiKey()) throw new Error("Missing GEMINI_API_KEY");

    const { loadMediaBytes, guessMimeFromPath, storeMediaBytes } = await import("./local-media.server");
    const { buildLockedOmniPrompt } = await import("./identity-lock.server");
    const { sanitizeOmniPrompt } = await import("./omni-prompt.server");

    let reference: { bytes: Uint8Array; mimeType: string } | undefined;
    if (data.referencePath) {
      if (!data.referencePath.startsWith(`${context.userId}/`)) {
        throw new Error("Referință invalidă.");
      }
      const refBytes = await loadMediaBytes(data.referencePath);
      if (refBytes) {
        reference = { bytes: refBytes, mimeType: guessMimeFromPath(data.referencePath) };
      }
    }

    const rawOmni = buildLockedOmniPrompt({
      brief: data.brief,
      hook: data.hook,
      scenes: data.scenes,
      businessType: data.businessType,
      hasReference: !!reference,
    });
    const omniPrompt = sanitizeOmniPrompt(rawOmni);

    try {
      const persisted = await generateAndPersistGeminiVideo(omniPrompt, {
        aspectRatio: "9:16",
        persistUserId: context.userId,
        persistLabel: `studio-${data.postId.slice(0, 8)}`,
        ...(reference ? { task: "image_to_video" as const, image: reference } : {}),
      });
      const path =
        persisted.path ??
        (
          await storeMediaBytes(
            `${context.userId}/${data.postId}-omni-${Date.now()}.mp4`,
            persisted.bytes,
            "video/mp4",
          )
        ).path;
      const url = persisted.url ?? `/local-media/${path}`;
      const candidate: StudioCandidate = {
        id: "reel-omni",
        kind: "reel_video",
        label: "Clip Omni",
        path,
        signedUrl: url,
        angle: data.hook || "Omni",
      };
      return { ok: true as const, candidate };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[studio omni]", msg);
      // Retry fără imagine dacă block pe likeness — totuși cu identity lock pe text
      if (reference && /content_blocked|likeness|real people|names/i.test(msg)) {
        const persisted = await generateAndPersistGeminiVideo(sanitizeOmniPrompt(rawOmni), {
          aspectRatio: "9:16",
          persistUserId: context.userId,
          persistLabel: `studio-${data.postId.slice(0, 8)}-text`,
        });
        const path =
          persisted.path ??
          (
            await storeMediaBytes(
              `${context.userId}/${data.postId}-omni-${Date.now()}.mp4`,
              persisted.bytes,
              "video/mp4",
            )
          ).path;
        const url = persisted.url ?? `/local-media/${path}`;
        return {
          ok: true as const,
          candidate: {
            id: "reel-omni",
            kind: "reel_video" as const,
            label: "Clip Omni",
            path,
            signedUrl: url,
            angle: data.hook || "Omni",
          },
          note: "Clip generat fără referință imagine (Google a blocat likeness). Verifică dacă produsul e corect.",
        };
      }
      throw new Error(msg.slice(0, 280));
    }
  });

export const selectStudioAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      postId: z.string().uuid(),
      path: z.string().min(3).max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`)) throw new Error("Acces interzis.");
    const { error } = await context.supabase
      .from("generated_posts")
      .update({ image_url: data.path, approval_status: "approved" })
      .eq("id", data.postId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const targetSchema = z.array(z.string().regex(/^[0-9a-f-]{36}:(fb|ig)$/i)).min(1);

export const publishStudioSelection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      postId: z.string().uuid(),
      path: z.string().min(3).max(500),
      profileIds: targetSchema,
      scheduledDate: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`)) throw new Error("Acces interzis.");

    const { data: post, error: pErr } = await context.supabase
      .from("generated_posts")
      .select("id,user_id,brand_id")
      .eq("id", data.postId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (pErr || !post) throw new Error("Postare inexistentă.");

    const connIds = Array.from(new Set(data.profileIds.map((t) => t.split(":")[0])));
    const { data: conns } = await context.supabase
      .from("meta_connections")
      .select("id")
      .in("id", connIds)
      .eq("user_id", context.userId);
    if ((conns?.length ?? 0) !== connIds.length) {
      throw new Error("Unul dintre conturile selectate nu îți aparține.");
    }

    await context.supabase
      .from("generated_posts")
      .update({ image_url: data.path, approval_status: "approved" })
      .eq("id", data.postId)
      .eq("user_id", context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { enqueueJobs, processJobs } = await import("./publishing-queue.server");

    if (data.scheduledDate) {
      const when = new Date(data.scheduledDate);
      if (isNaN(when.getTime()) || when.getTime() < Date.now()) throw new Error("Data trebuie să fie în viitor.");
      await supabaseAdmin.from("generated_posts").update({
        status: "scheduled",
        scheduled_date: when.toISOString(),
        target_profile_ids: data.profileIds,
        last_publish_error: null,
      }).eq("id", post.id);
      await enqueueJobs(supabaseAdmin, post, data.profileIds, when.toISOString());
      return { mode: "scheduled" as const, when: when.toISOString() };
    }

    const now = new Date().toISOString();
    await supabaseAdmin.from("generated_posts").update({
      target_profile_ids: data.profileIds,
      status: "scheduled",
      scheduled_date: now,
      last_publish_error: null,
    }).eq("id", post.id);
    await enqueueJobs(supabaseAdmin, post, data.profileIds, now);
    const results = await processJobs(supabaseAdmin, { postId: post.id });
    return {
      mode: "published" as const,
      results: results.map((r) => ({ target: r.target, ok: r.ok, error: r.error })),
    };
  });
