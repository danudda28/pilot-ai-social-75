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
  return process.env.GEMINI_VIDEO_MODEL?.trim() || "gemini-omni-1.1-flash";
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

type InteractionStep = {
  type?: string;
  content?: Array<{ type?: string; mime_type?: string; data?: string }>;
};

function extractVideoB64(json: unknown): string | null {
  const root = json as {
    output_video?: { data?: string };
    steps?: InteractionStep[];
    status?: string;
  };
  if (root.output_video?.data) return root.output_video.data;
  for (const step of root.steps ?? []) {
    if (step.type !== "model_output") continue;
    for (const part of step.content ?? []) {
      if (part.type === "video" && part.data) return part.data;
    }
  }
  return null;
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

/**
 * Generează video Omni și, dacă e dat persistUserId, salvează MP4 pe disc
 * în aceeași secundă în care vine răspunsul — înainte de orice alt pas.
 */
export async function generateAndPersistGeminiVideo(
  prompt: string,
  opts?: GeminiVideoOptions,
): Promise<GeminiVideoResult> {
  const apiKey = requireGeminiApiKey();
  const aspectRatio = opts?.aspectRatio ?? "9:16";
  const hasImage = !!opts?.image;

  const input: unknown = hasImage
    ? [
        {
          type: "image",
          data: bytesToB64(opts!.image!.bytes),
          mime_type: opts!.image!.mimeType,
        },
        { type: "text", text: prompt },
      ]
    : prompt;

  const body: Record<string, unknown> = {
    model: videoModel(),
    input,
    response_format: {
      type: "video",
      aspect_ratio: aspectRatio,
    },
  };

  if (hasImage || opts?.task === "image_to_video") {
    body.generation_config = {
      video_config: { task: "image_to_video" },
    };
  }

  const res = await fetch(`${GEMINI_BASE}/interactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const rawText = await res.text();

  if (!res.ok) {
    if (res.status === 429) throw new Error("Prea multe cereri Gemini video. Reîncearcă în câteva secunde.");
    if (res.status === 403 || res.status === 401) {
      throw new Error("GEMINI_API_KEY invalidă sau fără acces la Omni video.");
    }
    throw new Error(`Gemini video ${res.status}: ${rawText.slice(0, 400)}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    // backup brut ca să nu pierzi răspunsul dacă JSON-ul e ciudat
    if (opts?.persistUserId) {
      const { saveLocalMedia } = await import("./local-media.server");
      await saveLocalMedia(
        `${opts.persistUserId}/omni/raw-fail-${Date.now()}.txt`,
        new TextEncoder().encode(rawText.slice(0, 5_000_000)),
        "text/plain",
      );
    }
    throw new Error("Răspuns Omni invalid (JSON). Am salvat raw pe disc dacă era posibil.");
  }

  let b64 = extractVideoB64(json);
  const id = (json as { id?: string; status?: string }).id;
  let status = (json as { status?: string }).status;

  if (!b64 && id && status && status !== "completed" && status !== "failed") {
    for (let i = 0; i < 90; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const poll = await fetch(`${GEMINI_BASE}/interactions/${encodeURIComponent(id)}`, {
        headers: { "x-goog-api-key": apiKey },
      });
      if (!poll.ok) continue;
      const pollText = await poll.text();
      let pj: unknown;
      try {
        pj = JSON.parse(pollText);
      } catch {
        continue;
      }
      status = (pj as { status?: string }).status;
      b64 = extractVideoB64(pj);
      if (b64 || status === "completed" || status === "failed") break;
    }
  }

  if (!b64) throw new Error("Gemini Omni nu a returnat video. Reîncearcă.");

  const bytes = b64ToBytes(b64);

  // CRITICAL: salvează pe disc ÎNAINTE să returnăm / să facă altceva caller-ul
  if (opts?.persistUserId) {
    const { saveOmniClipLocal } = await import("./local-media.server");
    const saved = await saveOmniClipLocal(opts.persistUserId, bytes, {
      label: opts.persistLabel ?? "omni",
      interactionId: id,
      prompt,
    });
    return { bytes, path: saved.path, url: saved.publicUrl, interactionId: id };
  }

  return { bytes, interactionId: id };
}
