/**
 * Direct Google Gemini API (AI Studio / Generative Language).
 * Prefer GEMINI_API_KEY locally; falls back only when callers allow Lovable.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

function imageModel() {
  // Nano Banana 2 / 3.1 Flash Image — override via GEMINI_IMAGE_MODEL
  return process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image";
}

function videoModel() {
  return process.env.GEMINI_VIDEO_MODEL?.trim() || "veo-3.1-fast-generate-preview";
}

function textModel() {
  return process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-3.8-flash";
}

export async function generateGeminiText(prompt: string): Promise<string> {
  const apiKey = requireGeminiApiKey();
  const res = await fetch(
    `${GEMINI_BASE}/models/${encodeURIComponent(textModel())}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini text ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || null;
}

export function requireGeminiApiKey(): string {
  const key = getGeminiApiKey();
  if (!key) throw new Error("Missing GEMINI_API_KEY — pune-o în .env.local");
  return key;
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(s);
}

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

function extractImageBytes(json: unknown): Uint8Array | null {
  const candidates = (json as { candidates?: Array<{ content?: { parts?: GeminiPart[] } }> })
    ?.candidates;
  for (const c of candidates ?? []) {
    for (const p of c.content?.parts ?? []) {
      const data = p.inlineData?.data ?? p.inline_data?.data;
      if (data) return b64ToBytes(data);
    }
  }
  return null;
}

/** Generate one still image from a text prompt (Nano Banana / Flash Image). */
export async function generateGeminiImage(
  prompt: string,
  opts?: {
    aspectRatio?: "1:1" | "9:16" | "16:9";
    /** Optional reference photo (product / style) */
    reference?: { bytes: Uint8Array; mimeType: string };
  },
): Promise<Uint8Array> {
  const apiKey = requireGeminiApiKey();
  const aspectRatio = opts?.aspectRatio ?? "1:1";

  const parts: Array<Record<string, unknown>> = [];
  if (opts?.reference?.bytes?.length) {
    const { IDENTITY_LOCK } = await import("./identity-lock.server");
    parts.push({
      inline_data: {
        mime_type: opts.reference.mimeType,
        data: bytesToB64(opts.reference.bytes),
      },
    });
    parts.push({
      text: [
        prompt,
        "",
        IDENTITY_LOCK,
        "The attached image is the ground-truth product/service. Keep it pixel-faithful in identity (shape, colors, label text, logos). Only change camera, light, and background.",
        "Any NEW text you add on the image (badges, captions) must be Romanian with correct diacritics and spelling — never gibberish. Do not alter text already printed on the product.",
      ].join("\n"),
    });
  } else {
    parts.push({ text: prompt });
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio },
    },
  };

  const url = `${GEMINI_BASE}/models/${encodeURIComponent(imageModel())}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Prea multe cereri Gemini. Reîncearcă în câteva secunde.");
    if (res.status === 403 || res.status === 401) {
      throw new Error("GEMINI_API_KEY invalidă sau fără acces la modelul de imagini.");
    }
    throw new Error(`Gemini image ${res.status}: ${t.slice(0, 300)}`);
  }

  const json = await res.json();
  const bytes = extractImageBytes(json);
  if (!bytes) throw new Error("Gemini nu a returnat imagine. Reîncearcă.");
  return bytes;
}

export type GeminiVideoOptions = {
  aspectRatio?: "9:16" | "16:9";
  /** Optional still as first frame / guide */
  image?: { bytes: Uint8Array; mimeType: string };
  task?: "text_to_video" | "image_to_video";
  /** Dacă e setat, MP4-ul se scrie pe disc ÎNAINTE de return (nu se pierde). */
  persistUserId?: string;
  persistLabel?: string;
};

export type GeminiVideoResult = {
  bytes: Uint8Array;
  /** Path relativ în public/local-media (dacă persistUserId a fost setat) */
  path?: string;
  url?: string;
  interactionId?: string;
};

/** Text (or image+text) → MP4 via Gemini Omni Flash. Cu persistUserId: salvare locală imediată. */
export async function generateGeminiVideo(
  prompt: string,
  opts?: GeminiVideoOptions,
): Promise<Uint8Array> {
  const result = await generateAndPersistGeminiVideo(prompt, opts);
  return result.bytes;
}

type VeoOperation = {
  name?: string;
  done?: boolean;
  error?: { message?: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string } }>;
    };
  };
};

/**
 * Generează video cu Veo (predictLongRunning) prin cheia GEMINI_API_KEY și,
 * dacă e dat persistUserId, salvează MP4 pe disc înainte de return.
 */
export async function generateAndPersistGeminiVideo(
  prompt: string,
  opts?: GeminiVideoOptions,
): Promise<GeminiVideoResult> {
  const apiKey = requireGeminiApiKey();
  const aspectRatio = opts?.aspectRatio ?? "9:16";
  const hasImage = !!opts?.image;

  const instance: Record<string, unknown> = { prompt };
  if (hasImage) {
    instance.image = {
      bytesBase64Encoded: bytesToB64(opts!.image!.bytes),
      mimeType: opts!.image!.mimeType,
    };
  }

  const createRes = await fetch(
    `${GEMINI_BASE}/models/${encodeURIComponent(videoModel())}:predictLongRunning`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        instances: [instance],
        parameters: { aspectRatio, resolution: "720p" },
      }),
    },
  );

  const createText = await createRes.text();
  if (!createRes.ok) {
    if (createRes.status === 429) throw new Error("Prea multe cereri Gemini video. Reîncearcă în câteva secunde.");
    if (createRes.status === 403 || createRes.status === 401) {
      throw new Error("GEMINI_API_KEY invalidă sau fără acces la Veo video.");
    }
    throw new Error(`Gemini video ${createRes.status}: ${createText.slice(0, 400)}`);
  }

  let op: VeoOperation;
  try {
    op = JSON.parse(createText);
  } catch {
    throw new Error("Răspuns Veo invalid (JSON).");
  }
  const opName = op.name;
  if (!opName) throw new Error("Veo nu a returnat un id de operațiune.");

  // Poll până e gata (Veo durează de obicei 1-3 minute)
  let videoUri: string | null = null;
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const poll = await fetch(`${GEMINI_BASE}/${opName}`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!poll.ok) continue;
    let pj: VeoOperation;
    try {
      pj = (await poll.json()) as VeoOperation;
    } catch {
      continue;
    }
    if (pj.error) throw new Error(`Veo eșuat: ${pj.error.message ?? "necunoscut"}`);
    if (pj.done) {
      videoUri =
        pj.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ?? null;
      break;
    }
  }
  if (!videoUri) throw new Error("Generarea video a depășit timpul alocat. Reîncearcă.");

  // Descarcă MP4-ul (URI-ul cere cheia API)
  const vidRes = await fetch(videoUri, { headers: { "x-goog-api-key": apiKey } });
  if (!vidRes.ok) throw new Error("Nu pot descărca clipul generat de Veo.");
  const bytes = new Uint8Array(await vidRes.arrayBuffer());

  // CRITICAL: salvează clipul plătit ÎNAINTE să returnăm — pe disc local, sau în Supabase Storage în cloud.
  // Dacă salvarea eșuează, returnăm totuși bytes, ca apelantul să poată reîncerca stocarea.
  if (opts?.persistUserId) {
    const { saveOmniClipLocal, storeMediaBytes, isLocalMediaMode } = await import("./local-media.server");
    try {
      if (isLocalMediaMode()) {
        const saved = await saveOmniClipLocal(opts.persistUserId, bytes, {
          label: opts.persistLabel ?? "veo",
          interactionId: opName,
          prompt,
        });
        return { bytes, path: saved.path, url: saved.publicUrl, interactionId: opName };
      }
      const label = (opts.persistLabel ?? "veo").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 48) || "veo";
      const stored = await storeMediaBytes(
        `${opts.persistUserId}/omni/${Date.now()}-${label}.mp4`,
        bytes,
        "video/mp4",
      );
      return { bytes, path: stored.path, url: stored.url, interactionId: opName };
    } catch (e) {
      console.error("[veo] salvarea clipului a eșuat, returnez bytes către apelant:", e);
    }
  }

  return { bytes, interactionId: opName };
}
