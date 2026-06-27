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

async function generateImage(apiKey: string, prompt: string): Promise<Uint8Array> {
  const visualPrompt = `Fotografie profesională pentru Instagram Reels / Stories, format vertical 9:16, lumină naturală, compoziție cinematografică, culori vii dar realiste, fără text suprapus, fără watermark. ${prompt}`;
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
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    // Quota check (consumes 1 from posts_remaining — counts as a generation)
    const { data: profile } = await context.supabase
      .from("users_profiles")
      .select("posts_remaining,subscription_plan")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profile && (profile.posts_remaining ?? 0) <= 0) {
      throw new Error(`Limita planului ${profile.subscription_plan?.toUpperCase() ?? "FREE"} a fost atinsă. Fă upgrade pentru a genera video.`);
    }

    // 1) Generate storyboard JSON via Gemini
    const sys = `Ești un strateg de conținut video pentru Instagram Reels și Facebook în limba română. Răspunzi DOAR cu JSON valid, fără markdown, fără explicații.`;
    const user = `Creează un storyboard pentru un Reel scurt (~${data.scenes * 4} secunde) despre subiectul:
"${data.topic}"

Context: afacere de tip "${data.businessType}". Ton: ${data.tone}. Format: ${data.format === "reel" ? "vertical 9:16" : "pătrat 1:1"}.

Returnează STRICT acest JSON:
{
  "title": "titlu scurt intern (max 60 caractere)",
  "hook": "primele 3 secunde — propoziție care oprește scrollul (max 80 caractere)",
  "scenes": [
    { "caption": "text scurt afișat pe scenă, max 70 caractere", "imagePrompt": "descriere vizuală detaliată în engleză pentru AI image generator, fără text", "durationSec": 4 }
  ],
  "cta": "call to action final (max 60 caractere)",
  "fullCaption": "caption pentru postare, 2-4 propoziții în română cu emoji moderate",
  "hashtags": ["#hashtag1", "#hashtag2", "..."]
}

Trebuie să fie EXACT ${data.scenes} scene. Fiecare durationSec între 3 și 5. Hashtaguri: 8-12, relevante pentru România. Imaginile NU trebuie să conțină text.`;

    const txtRes = await callGateway(apiKey, {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    });
    const raw = txtRes.choices?.[0]?.message?.content ?? "";
    let storyboard: Storyboard;
    try {
      storyboard = JSON.parse(raw);
    } catch {
      // Try to extract JSON block
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("AI a returnat un răspuns invalid. Reîncearcă.");
      storyboard = JSON.parse(m[0]);
    }
    if (!storyboard?.scenes?.length) throw new Error("Storyboard invalid.");

    // 2) Generate images in parallel (cap to user's scene count)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const videoId = crypto.randomUUID();
    const folder = `${context.userId}/video-${videoId}`;

    const imageResults = await Promise.allSettled(
      storyboard.scenes.map(async (scene, i) => {
        const bytes = await generateImage(apiKey, scene.imagePrompt);
        const path = `${folder}/scene-${i + 1}.png`;
        const { error: upErr } = await supabaseAdmin.storage
          .from("post-images")
          .upload(path, bytes, { contentType: "image/png", upsert: true });
        if (upErr) throw new Error(upErr.message);
        const { data: signed, error: sErr } = await supabaseAdmin.storage
          .from("post-images")
          .createSignedUrl(path, 60 * 60 * 24 * 7);
        if (sErr) throw new Error(sErr.message);
        return { path, signedUrl: signed.signedUrl };
      }),
    );

    storyboard.scenes = storyboard.scenes.map((scene, i) => {
      const r = imageResults[i];
      if (r.status === "fulfilled") return { ...scene, path: r.value.path, signedUrl: r.value.signedUrl };
      return scene;
    });

    const failedCount = imageResults.filter(r => r.status === "rejected").length;

    // 3) Decrement quota
    if (profile) {
      await context.supabase
        .from("users_profiles")
        .update({ posts_remaining: Math.max(0, (profile.posts_remaining ?? 1) - 1) })
        .eq("user_id", context.userId);
    }

    return {
      videoId,
      storyboard,
      failedCount,
    };
  });
