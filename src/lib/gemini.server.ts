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
  const m = process.env.GEMINI_VIDEO_MODEL?.trim();
  // Veo was retired from the Gemini API; an old secret must not break video.
  return m && !m.startsWith("veo-") ? m : "gemini-omni-1.1-flash";
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

/** Video models misspell on-screen text, so subtitles are added by us after generation. */
const VIDEO_NO_TEXT_RULE = [
  "STRICT: do not render any written text on screen — no subtitles, captions, titles, letters, numbers, price tags or new logos.",
  "Text already printed on the real product or signage in the reference stays exactly as it is.",
  "Audio: ambient sound and soft background music only, no spoken dialogue and no voice-over.",
].join(" ");

/** Width/height from PNG, JPEG or WebP headers; null when unknown. */
export function readImageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1];
      const len = dv.getUint16(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: dv.getUint16(i + 7), height: dv.getUint16(i + 5) };
      }
      i += 2 + len;
    }
    return null;
  }
  if (bytes.length > 30 && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP") {
    const chunk = String.fromCharCode(...bytes.subarray(12, 16));
    if (chunk === "VP8X") {
      return {
        width: 1 + (bytes[24] | (bytes[25] << 8) | (bytes[26] << 16)),
        height: 1 + (bytes[27] | (bytes[28] << 8) | (bytes[29] << 16)),
      };
    }
    if (chunk === "VP8 ") return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
    if (chunk === "VP8L") {
      const b = dv.getUint32(21, true);
      return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

/**
 * Landscape/square references are recomposed into a 9:16 frame (same subject, scene extended)
 * so the clip is a true vertical shot instead of a cropped or letterboxed one.
 */
async function ensurePortraitReference(image: { bytes: Uint8Array; mimeType: string }) {
  const size = readImageSize(image.bytes);
  if (size && size.height / size.width >= 1.6) return image;
  try {
    const bytes = await generateGeminiImage(
      [
        "Recompose this exact photo as a vertical 9:16 frame for an Instagram Reel.",
        "Keep the subject, the place and every detail identical; extend the scene naturally above and below instead of cropping the subject.",
        "Output one single seamless photograph, not a collage: no seams, splits, borders or repeated objects.",
        "Photorealistic, same light and colors. Do not add any new text.",
      ].join(" "),
      { aspectRatio: "9:16", reference: image },
    );
    return { bytes, mimeType: "image/png" };
  } catch (e) {
    console.warn("[video] portrait reference failed, using original:", e);
    return image;
  }
}

/** Display width/height of the first video track (tkhd box) in an MP4; null when unknown. */
export function readMp4Size(bytes: Uint8Array): { width: number; height: number } | null {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const containers = new Set(["moov", "trak"]);
  const walk = (from: number, to: number): { width: number; height: number } | null => {
    let i = from;
    while (i + 8 <= to) {
      let size = dv.getUint32(i);
      const type = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]);
      let header = 8;
      if (size === 1 && i + 16 <= to) {
        size = Number(dv.getBigUint64(i + 8));
        header = 16;
      } else if (size === 0) size = to - i;
      if (size < header) return null;
      if (type === "tkhd") {
        const end = i + size;
        const width = dv.getUint32(end - 8) / 65536;
        const height = dv.getUint32(end - 4) / 65536;
        if (width > 0 && height > 0) return { width, height };
      } else if (containers.has(type)) {
        const found = walk(i + header, Math.min(i + size, to));
        if (found) return found;
      }
      i += size;
    }
    return null;
  };
  return walk(0, bytes.length);
}

function extractVideoB64(json: unknown): string | null {
  const j = json as {
    output_video?: { data?: string };
    steps?: Array<{ content?: Array<{ type?: string; data?: string }> }>;
    outputs?: Array<{ type?: string; data?: string }>;
  };
  if (j?.output_video?.data) return j.output_video.data;
  for (const step of j?.steps ?? []) {
    for (const part of step.content ?? []) if (part.type === "video" && part.data) return part.data;
  }
  for (const part of j?.outputs ?? []) if (part.type === "video" && part.data) return part.data;
  return null;
}

async function requestOmniVideo(
  apiKey: string,
  prompt: string,
  image?: { bytes: Uint8Array; mimeType: string },
): Promise<{ bytes: Uint8Array; id?: string }> {
  const body: Record<string, unknown> = {
    model: videoModel(),
    input: image
      ? [
          { type: "image", data: bytesToB64(image.bytes), mime_type: image.mimeType },
          { type: "text", text: prompt },
        ]
      : prompt,
    response_format: { type: "video", aspect_ratio: "9:16" },
  };
  if (image) body.generation_config = { video_config: { task: "image_to_video" } };

  const res = await fetch(`${GEMINI_BASE}/interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  if (!res.ok) {
    if (res.status === 429) throw new Error("Prea multe cereri Gemini video. Reîncearcă în câteva secunde.");
    if (res.status === 403 || res.status === 401) throw new Error("GEMINI_API_KEY invalidă sau fără acces la video.");
    throw new Error(`Gemini video ${res.status}: ${rawText.slice(0, 400)}`);
  }
  let json: unknown = JSON.parse(rawText);
  let b64 = extractVideoB64(json);
  const id = (json as { id?: string }).id;
  let status = (json as { status?: string }).status;
  for (let i = 0; !b64 && id && status !== "completed" && status !== "failed" && i < 120; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await fetch(`${GEMINI_BASE}/interactions/${encodeURIComponent(id)}`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!poll.ok) continue;
    try {
      json = await poll.json();
    } catch {
      continue;
    }
    status = (json as { status?: string }).status;
    b64 = extractVideoB64(json);
  }
  if (!b64) throw new Error("Generarea video nu a returnat clipul. Reîncearcă.");
  return { bytes: b64ToBytes(b64), id };
}

/**
 * Generează clipul vertical (9:16) prin Gemini Omni și, dacă e dat persistUserId,
 * salvează MP4-ul înainte de return.
 */
export async function generateAndPersistGeminiVideo(
  prompt: string,
  opts?: GeminiVideoOptions,
): Promise<GeminiVideoResult> {
  const apiKey = requireGeminiApiKey();
  // Every clip is a vertical Reel, whatever the caller or the reference photo says.
  const image = opts?.image ? await ensurePortraitReference(opts.image) : undefined;
  const fullPrompt = `${prompt}\n\nFormat: vertical 9:16 portrait video for Instagram Reels, framed for a phone held upright.\n${VIDEO_NO_TEXT_RULE}`;

  let { bytes, id: opName } = await requestOmniVideo(apiKey, fullPrompt, image);
  const size = readMp4Size(bytes);
  if (size && size.width > size.height) {
    console.warn("[video] model returned landscape", size, "- retrying once");
    try {
      const retry = await requestOmniVideo(apiKey, `VERTICAL 9:16 PORTRAIT ONLY, taller than wide.\n${fullPrompt}`, image);
      const retrySize = readMp4Size(retry.bytes);
      if (!retrySize || retrySize.height > retrySize.width) ({ bytes, id: opName } = retry);
    } catch (e) {
      console.warn("[video] portrait retry failed:", e);
    }
  }

  // CRITICAL: salvează clipul plătit ÎNAINTE să returnăm — pe disc local, sau în Supabase Storage în cloud.
  // Dacă salvarea eșuează, returnăm totuși bytes, ca apelantul să poată reîncerca stocarea.
  if (opts?.persistUserId) {
    const { saveOmniClipLocal, storeMediaBytes, isLocalMediaMode } = await import("./local-media.server");
    try {
      if (isLocalMediaMode()) {
        const saved = await saveOmniClipLocal(opts.persistUserId, bytes, {
          label: opts.persistLabel ?? "omni",
          interactionId: opName,
          prompt,
        });
        return { bytes, path: saved.path, url: saved.publicUrl, interactionId: opName };
      }
      const label = (opts.persistLabel ?? "omni").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 48) || "veo";
      const stored = await storeMediaBytes(
        `${opts.persistUserId}/omni/${Date.now()}-${label}.mp4`,
        bytes,
        "video/mp4",
      );
      return { bytes, path: stored.path, url: stored.url, interactionId: opName };
    } catch (e) {
      console.error("[video] salvarea clipului a eșuat, returnez bytes către apelant:", e);
    }
  }

  return { bytes, interactionId: opName };
}
