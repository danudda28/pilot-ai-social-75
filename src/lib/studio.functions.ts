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

function detectKind(text: string): StudioKind {
  const t = text.toLowerCase();
  if (/(reel|video|clip|filmare)/i.test(t) && /(poz[aă]|imagine|foto|poze)/i.test(t)) return "both";
  if (/(reel|video|clip|filmare)/i.test(t)) return "reel";
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

async function genImageBytes(apiKey: string, prompt: string) {
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
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const kind = data.kind ?? detectKind(data.brief);
    const variants = data.variants ?? (kind === "reel" ? 2 : 3);
    const eta = estimateSeconds(kind, variants);
    return {
      kind,
      variants,
      ...eta,
      human: `Cam ${Math.max(1, Math.round(eta.totalSec / 60))} ${eta.totalSec < 90 ? "minut" : "minute"} · ~${eta.totalSec}s`,
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("post-images")
      .upload(path, bytes, { contentType: data.mimeType, upsert: true });
    if (error) throw new Error(`Upload eșuat: ${error.message}`);
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("post-images")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (sErr) throw new Error(sErr.message);
    return { path, signedUrl: signed.signedUrl, fileName: data.fileName ?? `referinta.${ext}` };
  });

export type StudioCandidate = {
  id: string;
  kind: "image" | "reel_frame";
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const kind = data.kind ?? detectKind(data.brief);
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

    const refNote = data.referencePath
      ? `Clientul a încărcat o referință vizuală (${data.referenceNote || "produs/serviciu"}). Folosește-o ca ghid de stil, unghi, produs și atmosferă — nu inventa un alt produs.`
      : "Clientul NU are referință vizuală. Construiește imaginile din descrierea verbală, realist, fără elemente inventate care contrazic brief-ul.";

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const goalsRo: Record<string, string> = {
      vanzare: "vânzare directă",
      awareness: "creștere notorietate",
      promovare: "promovare ofertă",
      educare: "educare audiență",
      testimonial: "testimonial / social proof",
    };

    const prompt = `Ești un copywriter senior pentru social media în România. Scrie ÎN ROMÂNĂ.

CONTEXT
- Domeniu: ${domain}
- Tip afacere: ${businessType}
- Ton: ${tone}
- Obiectiv: ${goalsRo[goal]}
- Tip: ${kind === "image" ? "postare statică" : "reel + vizual"}
- Brief client: ${data.brief}
- ${refNote}
${ctx ? `\nBRAND BRAIN\n${BRAND_RULES}\n${brandContextBlock(ctx)}` : ""}

Răspunde STRICT cu JSON valid:
{
  "title": "max 60 caractere",
  "copy": "postare completă cu \\n\\n, emoji moderate, CTA la final",
  "short_copy": "max 2 propoziții",
  "hashtags": "#tag1 #tag2 ...",
  "visual_idea": "descriere concretă a imaginii",
  "call_to_action": "CTA scurt",
  "image_angles": ["unghi 1", "unghi 2", "unghi 3"],
  "reel_hook": "hook 3s pentru reel sau string gol",
  "reel_scenes": [{"caption":"...","imagePrompt":"english visual prompt","durationSec":4}]
}`;

    const { text, usage } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      prompt,
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await logAiUsage(supabaseAdmin, {
      brandId,
      userId: context.userId,
      feature: "studio_create",
      model: "google/gemini-2.5-flash",
      usage: usage as any,
    });

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

    for (let i = 0; i < angles.length; i++) {
      try {
        const visualPrompt = `Professional editorial social media photo for Instagram/Facebook, natural lighting, high quality, no watermark, no fake logo. Subject: ${parsed.visual_idea || data.brief}. Angle: ${angles[i]}. ${data.referencePath ? "Match the client's reference product/style closely." : "Based only on the verbal brief."}`;
        const bytes = await genImageBytes(apiKey, visualPrompt);
        const path = `${context.userId}/${inserted.id}-v${i + 1}-${Date.now()}.png`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("post-images")
          .upload(path, bytes, { contentType: "image/png", upsert: true });
        if (upErr) continue;
        const { data: signed } = await supabaseAdmin.storage
          .from("post-images")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (!signed?.signedUrl) continue;
        candidates.push({
          id: `img-${i + 1}`,
          kind: "image",
          label: `Poză ${i + 1}`,
          path,
          signedUrl: signed.signedUrl,
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
          `Vertical 9:16 Instagram Reel keyframe, cinematic, no text overlay. ${scene.imagePrompt}. Brief: ${data.brief.slice(0, 180)}`,
        );
        const path = `${context.userId}/${inserted.id}-reel-key-${Date.now()}.png`;
        await supabaseAdmin.storage.from("post-images").upload(path, bytes, { contentType: "image/png", upsert: true });
        const { data: signed } = await supabaseAdmin.storage
          .from("post-images")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (signed?.signedUrl) {
          candidates.push({
            id: "reel-key",
            kind: "reel_frame",
            label: "Cadru Reel",
            path,
            signedUrl: signed.signedUrl,
            angle: reel.hook || "Reel",
          });
        }
      } catch {
        /* optional */
      }
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

    return {
      post: inserted,
      candidates,
      reel,
      kind,
      reply:
        candidates.length > 0
          ? `Gata. Am ${candidates.length} ${candidates.length === 1 ? "variantă" : "variante"} gata. Alege ce publicăm pe Facebook și Instagram — sau spune-mi ce să schimb.`
          : "Am scris textul, dar imaginile nu au putut fi generate acum. Reîncearcă sau încarcă o referință.",
      warnings: { bannedWords: bannedHits, usedBrandBrain: !!ctx },
    };
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
