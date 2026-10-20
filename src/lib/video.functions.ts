import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  topic: z.string().min(3).max(500),
  businessType: z.string().min(2).max(200),
  tone: z.enum(["profesional", "prietenos", "premium", "amuzant", "direct"]).default("prietenos"),
  format: z.enum(["reel", "square"]).default("reel"),
  scenes: z.number().int().min(3).max(6).default(4),
});

type Scene = { caption: string; imagePrompt: string; durationSec: number; signedUrl?: string; path?: string };
type Storyboard = {
  title: string;
  hook: string;
  scenes: Scene[];
  cta: string;
  fullCaption: string;
  hashtags: string[];
};

async function callGateway(apiKey: string, body: object) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 402) throw new Error("Creditele AI s-au epuizat. Reîncarcă din Setări → Workspace.");
    if (res.status === 429) throw new Error("Prea multe cereri. Reîncearcă în câteva secunde.");
    throw new Error(`AI Gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<{ choices: Array<{ message: { content: string } }> }>;
}

async function generateImage(apiKey: string | null, prompt: string): Promise<Uint8Array> {
  const { buildLockedImagePrompt } = await import("./identity-lock.server");
  const visualPrompt = buildLockedImagePrompt({
    brief: prompt,
    angle: "cinematic vertical frame",
    visualIdea: prompt,
    hasReference: false,
    aspect: "9:16",
    extra: "No on-screen caption text, no watermark.",
  });
  const { getGeminiApiKey, generateGeminiImage } = await import("./gemini.server");
  if (getGeminiApiKey()) {
    return generateGeminiImage(visualPrompt, { aspectRatio: "9:16" });
  }
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY (sau LOVABLE_API_KEY)");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: visualPrompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 402) throw new Error("Creditele AI s-au epuizat.");
    if (res.status === 429) throw new Error("Prea multe cereri pentru generare imagini.");
    throw new Error(`Generare imagine eșuată: ${res.status} ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("AI nu a returnat imagine.");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const generateVideoStoryboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { getGeminiApiKey, generateAndPersistGeminiVideo } = await import("./gemini.server");
    const apiKey = process.env.LOVABLE_API_KEY ?? null;
    if (!apiKey && !getGeminiApiKey()) {
      throw new Error("Missing GEMINI_API_KEY (sau LOVABLE_API_KEY)");
    }

    const { data: profile } = await context.supabase
      .from("users_profiles")
      .select("posts_remaining,subscription_plan")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profile && (profile.posts_remaining ?? 0) <= 0) {
      throw new Error(`Limita planului ${profile.subscription_plan?.toUpperCase() ?? "FREE"} a fost atinsă. Fă upgrade pentru a genera video.`);
    }

    const { RO_TEXT_QUALITY, COPY_RO_RULES } = await import("./identity-lock.server");
    const sys = `Ești un strateg de conținut video pentru Instagram Reels și Facebook. Scrie EXCLUSIV în română corectă, cu diacritice. Zero greșeli. Răspunzi DOAR cu JSON valid, fără markdown.
${COPY_RO_RULES}
${RO_TEXT_QUALITY}`;
    const user = `Creează un storyboard pentru un Reel scurt (~${data.scenes * 4} secunde) despre subiectul:
"${data.topic}"

Context: afacere de tip "${data.businessType}". Ton: ${data.tone}. Format: ${data.format === "reel" ? "vertical 9:16" : "pătrat 1:1"}.

Returnează STRICT acest JSON (title, hook, caption, cta, fullCaption = română corectă cu diacritice):
{
  "title": "titlu scurt (max 60 caractere)",
  "hook": "primele 3 secunde — propoziție care oprește scrollul (max 80 caractere)",
  "scenes": [
    { "caption": "text scurt pe scenă, max 70 caractere, română corectă", "imagePrompt": "descriere vizuală detaliată în engleză pentru AI image generator; nu inventa text pe imagine", "durationSec": 4 }
  ],
  "cta": "call to action final (max 60 caractere)",
  "fullCaption": "caption 2-4 propoziții în română corectă, emoji moderate",
  "hashtags": ["#hashtag1", "#hashtag2", "..."]
}

EXACT ${data.scenes} scene. durationSec între 3 și 5. Hashtaguri: 8-12, relevante RO. Verifică ortografia înainte de a răspunde.`;

    let raw = "";
    if (apiKey) {
      const txtRes = await callGateway(apiKey, {
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      });
      raw = txtRes.choices?.[0]?.message?.content ?? "";
    } else {
      const { generateGeminiText } = await import("./gemini.server");
      raw = await generateGeminiText(`${sys}\n\n${user}`);
    }

    let storyboard: Storyboard;
    try {
      storyboard = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI a returnat un răspuns invalid. Reîncearcă.");
      storyboard = JSON.parse(m[0]);
    }
    if (!storyboard?.scenes?.length) throw new Error("Storyboard invalid.");

    const { storeMediaBytes } = await import("./local-media.server");
    const videoId = crypto.randomUUID();
    const folder = `${context.userId}/video-${videoId}`;

    // Direct Omni: salvare locală IMEDIATĂ (persistUserId) — nu se pierde dacă UI crapă
    let omniReel: { path: string; signedUrl: string } | null = null;
    let omniError: string | null = null;
    if (getGeminiApiKey()) {
      try {
        const { sanitizeOmniPrompt } = await import("./omni-prompt.server");
        const { buildLockedOmniPrompt } = await import("./identity-lock.server");
        const omniPrompt = sanitizeOmniPrompt(
          buildLockedOmniPrompt({
            brief: data.topic,
            hook: storyboard.hook,
            scenes: storyboard.scenes.map((s) => s.caption),
            businessType: data.businessType,
            hasReference: false,
          }) + ` Tone: ${data.tone}. CTA mood: ${storyboard.cta}.`,
        );
        const persisted = await generateAndPersistGeminiVideo(omniPrompt, {
          aspectRatio: "9:16",
          persistUserId: context.userId,
          persistLabel: `video-${videoId}`,
        });
        if (!persisted.path || !persisted.url) {
          // fallback: forțează încă o scriere
          const stored = await storeMediaBytes(
            `${folder}/omni-reel.mp4`,
            persisted.bytes,
            "video/mp4",
          );
          omniReel = { path: stored.path, signedUrl: stored.url };
        } else {
          omniReel = { path: persisted.path, signedUrl: persisted.url };
        }
      } catch (e) {
        omniError = e instanceof Error ? e.message : "Omni video eșuat";
        console.error("[omni]", omniError);
      }
    }

    const imageResults = await Promise.allSettled(
      storyboard.scenes.map(async (scene, i) => {
        const bytes = await generateImage(apiKey, scene.imagePrompt);
        const stored = await storeMediaBytes(`${folder}/scene-${i + 1}.png`, bytes, "image/png");
        return { path: stored.path, signedUrl: stored.url };
      }),
    );

    storyboard.scenes = storyboard.scenes.map((scene, i) => {
      const r = imageResults[i];
      if (r.status === "fulfilled") return { ...scene, path: r.value.path, signedUrl: r.value.signedUrl };
      return scene;
    });

    const failedCount = imageResults.filter(r => r.status === "rejected").length;

    if (profile) {
      await context.supabase
        .from("users_profiles")
        .update({ posts_remaining: Math.max(0, (profile.posts_remaining ?? 1) - 1) })
        .eq("user_id", context.userId);
    }

    return {
      videoId,
      folder,
      storyboard,
      failedCount,
      omniReel,
      omniError,
    };
  });

// ============================================================
// REPLICATE: image-to-video per scene
// ============================================================

const SceneClipInput = z.object({
  folder: z.string().min(1),
  sceneIndex: z.number().int().min(0).max(10),
  imagePath: z.string().min(1),
  motionPrompt: z.string().min(2).max(500),
});

export const generateSceneClip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SceneClipInput.parse(d))
  .handler(async ({ data, context }) => {
    if (!data.folder.startsWith(`${context.userId}/`)) throw new Error("Acces interzis.");

    const { storeMediaBytes, loadMediaBytes, guessMimeFromPath, isLocalMediaMode } =
      await import("./local-media.server");
    const { getGeminiApiKey, generateAndPersistGeminiVideo } = await import("./gemini.server");

    // Prefer Gemini Omni image→video — persist pe disc imediat
    if (getGeminiApiKey()) {
      const buf = await loadMediaBytes(data.imagePath);
      if (!buf) throw new Error("Nu pot accesa imaginea sursă (salvează din nou storyboard-ul).");
      const mimeType = guessMimeFromPath(data.imagePath);
      const { IDENTITY_LOCK } = await import("./identity-lock.server");
      const persisted = await generateAndPersistGeminiVideo(
        [
          "Subtle cinematic motion, slow camera push-in, natural movement.",
          IDENTITY_LOCK,
          "Animate ONLY the attached reference — same product/service identity, unchanged label/shape/colors.",
          data.motionPrompt,
        ].join("\n"),
        {
          aspectRatio: "9:16",
          task: "image_to_video",
          image: { bytes: buf, mimeType },
          persistUserId: context.userId,
          persistLabel: `scene-${data.sceneIndex + 1}`,
        },
      );
      if (persisted.path && persisted.url) {
        return { path: persisted.path, signedUrl: persisted.url };
      }
      const stored = await storeMediaBytes(
        `${data.folder}/scene-${data.sceneIndex + 1}.mp4`,
        persisted.bytes,
        "video/mp4",
      );
      return { path: stored.path, signedUrl: stored.url };
    }

    const lovKey = process.env.LOVABLE_API_KEY;
    const repKey = process.env.REPLICATE_API_KEY;
    if (!lovKey || !repKey) throw new Error("Lipsește GEMINI_API_KEY (sau Replicate + LOVABLE).");
    if (isLocalMediaMode()) {
      throw new Error("Replicate necesită URL public. Folosește GEMINI_API_KEY pentru clipuri locale.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: srcSigned } = await supabaseAdmin.storage
      .from("post-images")
      .createSignedUrl(data.imagePath, 60 * 60);
    const imageUrl = srcSigned?.signedUrl;
    if (!imageUrl) throw new Error("Nu pot accesa imaginea sursă.");

    const gateway = "https://connector-gateway.lovable.dev/replicate/v1";
    const headers = {
      Authorization: `Bearer ${lovKey}`,
      "X-Connection-Api-Key": repKey,
      "Content-Type": "application/json",
    };

    // Create prediction
    const createRes = await fetch(`${gateway}/models/wan-video/wan-2.2-i2v-fast/predictions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: {
          image: imageUrl,
          prompt: `Subtle cinematic motion, slow camera push-in, natural movement. ${data.motionPrompt}`,
        },
      }),
    });
    if (!createRes.ok) {
      const t = await createRes.text().catch(() => "");
      if (createRes.status === 402 || /insufficient credit/i.test(t)) {
        throw new Error("Contul Replicate nu are credit. Intră pe replicate.com/account/billing, adaugă card și încarcă credit (min. $10), apoi reîncearcă în 2-3 min.");
      }
      if (createRes.status === 401 || createRes.status === 403) {
        throw new Error("Token Replicate invalid sau expirat. Reconectează Replicate din Workspace → Connectors.");
      }
      throw new Error(`Replicate ${createRes.status}: ${t.slice(0, 250)}`);
    }
    const created = (await createRes.json()) as { id: string };
    const predId = created.id;
    if (!predId) throw new Error("Replicate nu a returnat un id de prediction.");

    // Poll
    let outputUrl: string | null = null;
    const maxTries = 90; // ~3 minutes at 2s
    for (let i = 0; i < maxTries; i++) {
      await new Promise(r => setTimeout(r, i < 3 ? 2000 : 3000));
      const r = await fetch(`${gateway}/predictions/${predId}`, { headers });
      if (!r.ok) continue;
      const j = (await r.json()) as { status: string; output?: string | string[]; error?: string };
      if (j.status === "succeeded") {
        outputUrl = Array.isArray(j.output) ? j.output[0] : (j.output ?? null);
        break;
      }
      if (j.status === "failed" || j.status === "canceled") {
        throw new Error(`Replicate ${j.status}: ${j.error ?? "necunoscut"}`);
      }
    }
    if (!outputUrl) throw new Error("Generarea clipului a depășit timpul alocat. Reîncearcă.");

    // Download + upload to storage
    const vidRes = await fetch(outputUrl);
    if (!vidRes.ok) throw new Error("Nu pot descărca clipul generat.");
    const bytes = new Uint8Array(await vidRes.arrayBuffer());
    const path = `${data.folder}/scene-${data.sceneIndex + 1}.mp4`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("post-images")
      .upload(path, bytes, { contentType: "video/mp4", upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { data: signed } = await supabaseAdmin.storage
      .from("post-images")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    return { path, signedUrl: signed?.signedUrl ?? null };
  });

// ============================================================
// LOVABLE TTS: Romanian voice-over for the whole reel
// ============================================================

const TtsInput = z.object({
  folder: z.string().min(1),
  text: z.string().min(2).max(2000),
  voice: z.string().default("alloy"),
});

export const generateVoiceover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TtsInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    if (!data.folder.startsWith(`${context.userId}/`)) throw new Error("Acces interzis.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: data.text,
        voice: data.voice,
        response_format: "mp3",
        instructions: (await import("./identity-lock.server")).NATURAL_RO_VOICE,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (res.status === 402) throw new Error("Creditele AI s-au epuizat.");
      throw new Error(`TTS ${res.status}: ${t.slice(0, 200)}`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const { storeMediaBytes } = await import("./local-media.server");
    const stored = await storeMediaBytes(`${data.folder}/voiceover.mp3`, bytes, "audio/mpeg");
    return { path: stored.path, signedUrl: stored.url };
  });
