import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Video, Sparkles, Loader2, Download, Play, Pause, Wand2, FileText, Hash } from "lucide-react";
import { toast } from "sonner";
import { generateVideoStoryboard } from "@/lib/video.functions";

export const Route = createFileRoute("/_authenticated/dashboard/video")({
  head: () => ({ meta: [{ title: "AI Video & Reels — Social Spark" }] }),
  component: VideoPage,
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

const FORMATS = [
  { id: "reel", label: "Reel 9:16", w: 1080, h: 1920 },
  { id: "square", label: "Pătrat 1:1", w: 1080, h: 1080 },
] as const;

const TONES = [
  { id: "prietenos", label: "Prietenos" },
  { id: "profesional", label: "Profesional" },
  { id: "premium", label: "Premium" },
  { id: "amuzant", label: "Amuzant" },
  { id: "direct", label: "Direct" },
] as const;

function VideoPage() {
  const generate = useServerFn(generateVideoStoryboard);
  const [topic, setTopic] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>("prietenos");
  const [format, setFormat] = useState<"reel" | "square">("reel");
  const [scenes, setScenes] = useState(4);
  const [loading, setLoading] = useState(false);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [exporting, setExporting] = useState(false);

  async function onGenerate() {
    if (!topic.trim() || !businessType.trim()) {
      toast.error("Completează subiectul și tipul de afacere.");
      return;
    }
    setLoading(true);
    setStoryboard(null);
    try {
      const res = await generate({ data: { topic, businessType, tone, format, scenes } });
      const r = res as { storyboard: Storyboard; failedCount: number };
      setStoryboard(r.storyboard);
      if (r.failedCount > 0) toast.warning(`${r.failedCount} imagini nu s-au generat, le poți regenera.`);
      else toast.success("Storyboard generat! Vezi preview-ul mai jos.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Eroare generare.");
    } finally {
      setLoading(false);
    }
  }

  async function onExportVideo() {
    if (!storyboard) return;
    setExporting(true);
    try {
      const fmt = FORMATS.find(f => f.id === format)!;
      const url = await renderSlideshowWebm(storyboard, fmt.w, fmt.h);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${storyboard.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "reel"}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Video exportat (.webm). Poți încărca direct pe Reels/Facebook.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export eșuat.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Video className="h-7 w-7 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold">AI Video & Reels</h1>
          <p className="text-sm text-muted-foreground mt-1">Storyboard + imagini + caption + export video, în câteva secunde.</p>
        </div>
      </div>

      {/* Generator form */}
      <div className="glass-strong rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Subiectul reel-ului</span>
            <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3}
              placeholder="Ex: promovare oferta de toamnă -20% la coafat cu reducerea valabilă weekend-ul ăsta"
              className="w-full rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary resize-none" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Tip afacere</span>
            <input value={businessType} onChange={e => setBusinessType(e.target.value)}
              placeholder="Ex: salon de înfrumusețare, restaurant italian, sală fitness…"
              className="w-full rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <select value={tone} onChange={e => setTone(e.target.value as typeof tone)}
                className="rounded-lg bg-input/50 border border-border px-3 py-2 text-sm outline-none">
                {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <select value={format} onChange={e => setFormat(e.target.value as typeof format)}
                className="rounded-lg bg-input/50 border border-border px-3 py-2 text-sm outline-none">
                {FORMATS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div className="pt-2">
              <span className="text-xs text-muted-foreground">Scene: <b className="text-foreground">{scenes}</b></span>
              <input type="range" min={3} max={6} value={scenes} onChange={e => setScenes(parseInt(e.target.value))}
                className="w-full accent-primary" />
            </div>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button onClick={onGenerate} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl gradient-bg glow px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {loading ? "Generăm storyboard + imagini…" : "Generează video"}
          </button>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Consumă 1 generare din planul tău
          </span>
        </div>
      </div>

      {storyboard && <StoryboardPreview storyboard={storyboard} format={format} onExport={onExportVideo} exporting={exporting} />}
    </div>
  );
}

function StoryboardPreview({ storyboard, format, onExport, exporting }: {
  storyboard: Storyboard; format: "reel" | "square"; onExport: () => void; exporting: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aspect = format === "reel" ? "aspect-[9/16]" : "aspect-square";

  function startPlay() {
    setPlaying(true);
    setActiveIdx(0);
    advance(0);
  }
  function advance(i: number) {
    if (i >= storyboard.scenes.length) { setPlaying(false); return; }
    setActiveIdx(i);
    const dur = (storyboard.scenes[i].durationSec ?? 4) * 1000;
    timerRef.current = setTimeout(() => advance(i + 1), dur);
  }
  function stopPlay() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPlaying(false);
  }

  function copyCaption() {
    navigator.clipboard.writeText(`${storyboard.fullCaption}\n\n${storyboard.hashtags.join(" ")}`);
    toast.success("Caption + hashtaguri copiate.");
  }

  const active = storyboard.scenes[activeIdx];

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        {/* Preview player */}
        <div className="glass-strong rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Preview</p>
              <h3 className="font-display text-lg font-bold truncate">{storyboard.title}</h3>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={playing ? stopPlay : startPlay}
                className="inline-flex items-center gap-1.5 rounded-lg glass px-3 py-2 text-sm hover:bg-secondary">
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pauză" : "Redă"}
              </button>
              <button onClick={onExport} disabled={exporting}
                className="inline-flex items-center gap-1.5 rounded-lg gradient-bg px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? "Export…" : "Descarcă .webm"}
              </button>
            </div>
          </div>

          <div className={`relative mx-auto w-full max-w-[360px] ${aspect} rounded-xl overflow-hidden bg-black border border-border/40`}>
            {storyboard.scenes.map((s, i) => (
              <img key={i} src={s.signedUrl ?? ""} alt=""
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${i === activeIdx ? "opacity-100" : "opacity-0"} ${playing ? "animate-[kenburns_5s_ease-in-out_infinite_alternate]" : ""}`} />
            ))}
            <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/70 to-transparent">
              <p className="text-white font-display text-sm font-bold drop-shadow">{storyboard.hook}</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent space-y-1">
              <p className="text-white text-sm font-medium drop-shadow">{active?.caption}</p>
              <p className="text-white/70 text-[10px]">Scena {activeIdx + 1} / {storyboard.scenes.length} • {active?.durationSec}s</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Final: <span className="text-foreground font-medium">{storyboard.cta}</span>
          </p>
        </div>

        {/* Caption + hashtags */}
        <div className="space-y-4">
          <div className="glass-strong rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><h4 className="font-semibold text-sm">Caption</h4></div>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{storyboard.fullCaption}</p>
            <button onClick={copyCaption} className="w-full rounded-lg glass px-3 py-2 text-xs hover:bg-secondary">
              Copiază caption + hashtaguri
            </button>
          </div>
          <div className="glass-strong rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-accent" /><h4 className="font-semibold text-sm">Hashtaguri</h4></div>
            <div className="flex flex-wrap gap-1.5">
              {storyboard.hashtags.map(h => (
                <span key={h} className="text-[11px] glass rounded-full px-2 py-0.5">{h}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scene grid */}
      <div className="glass-strong rounded-2xl p-5 space-y-3">
        <h4 className="font-semibold text-sm">Storyboard ({storyboard.scenes.length} scene)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {storyboard.scenes.map((s, i) => (
            <div key={i} className="glass rounded-xl overflow-hidden border border-border/40">
              <div className={`${format === "reel" ? "aspect-[9/16]" : "aspect-square"} bg-black relative`}>
                {s.signedUrl ? (
                  <img src={s.signedUrl} alt={`Scena ${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">Imagine indisponibilă</div>
                )}
                <span className="absolute top-2 left-2 text-[10px] bg-black/60 text-white rounded px-1.5 py-0.5">#{i + 1} • {s.durationSec}s</span>
                {s.signedUrl && (
                  <a href={s.signedUrl} download={`scene-${i + 1}.png`}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded p-1 hover:bg-black/80" aria-label="Descarcă imagine">
                    <Download className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="p-2 text-xs text-muted-foreground line-clamp-3">{s.caption}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes kenburns {
          from { transform: scale(1.0) translate(0,0); }
          to   { transform: scale(1.12) translate(-2%, -2%); }
        }
      `}</style>
    </div>
  );
}

/** Render a slideshow as WebM in-browser using Canvas + MediaRecorder. */
async function renderSlideshowWebm(storyboard: Storyboard, w: number, h: number): Promise<string> {
  if (typeof MediaRecorder === "undefined") throw new Error("Browserul nu suportă export video. Folosește Chrome sau Edge.");

  // Preload images
  const imgs = await Promise.all(
    storyboard.scenes.map(s => new Promise<HTMLImageElement | null>(resolve => {
      if (!s.signedUrl) return resolve(null);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = s.signedUrl;
    })),
  );

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const fps = 30;
  const stream = canvas.captureStream(fps);
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9"
            : MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8"
            : "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>(res => { rec.onstop = () => res(); });
  rec.start();

  // Draw scenes with Ken Burns zoom + caption overlays
  function drawScene(img: HTMLImageElement | null, scene: Scene, t: number, dur: number, isHook: boolean, sceneIdx: number, total: number) {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
    const p = Math.min(1, Math.max(0, t / dur));
    if (img) {
      // Cover
      const ir = img.width / img.height;
      const cr = w / h;
      let dw = w, dh = h, dx = 0, dy = 0;
      if (ir > cr) { dh = h; dw = h * ir; dx = (w - dw) / 2; }
      else { dw = w; dh = w / ir; dy = (h - dh) / 2; }
      // zoom 1 -> 1.12
      const zoom = 1 + 0.12 * p;
      const zw = dw * zoom, zh = dh * zoom;
      const zx = dx - (zw - dw) / 2;
      const zy = dy - (zh - dh) / 2;
      ctx.drawImage(img, zx, zy, zw, zh);
    }
    // Gradients
    const top = ctx.createLinearGradient(0, 0, 0, h * 0.25);
    top.addColorStop(0, "rgba(0,0,0,0.75)"); top.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = top; ctx.fillRect(0, 0, w, h * 0.25);
    const bot = ctx.createLinearGradient(0, h * 0.7, 0, h);
    bot.addColorStop(0, "rgba(0,0,0,0)"); bot.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = bot; ctx.fillRect(0, h * 0.7, w, h * 0.3);

    // Hook (only on scene 0)
    ctx.fillStyle = "#fff"; ctx.textAlign = "center";
    if (isHook && sceneIdx === 0) {
      ctx.font = `700 ${Math.round(w * 0.06)}px "Space Grotesk", Inter, system-ui, sans-serif`;
      wrapText(ctx, storyboard.hook, w / 2, h * 0.12, w * 0.85, w * 0.07);
    }
    // Scene caption
    ctx.font = `600 ${Math.round(w * 0.052)}px Inter, system-ui, sans-serif`;
    wrapText(ctx, scene.caption, w / 2, h * 0.82, w * 0.85, w * 0.06);
    // CTA on last scene
    if (sceneIdx === total - 1) {
      ctx.font = `700 ${Math.round(w * 0.06)}px "Space Grotesk", Inter, system-ui, sans-serif`;
      ctx.fillStyle = "#fff";
      wrapText(ctx, storyboard.cta, w / 2, h * 0.92, w * 0.85, w * 0.07);
    }
    // Scene progress dots
    const dotW = w * 0.04, dotGap = w * 0.012, totalW = total * dotW + (total - 1) * dotGap;
    const startX = (w - totalW) / 2;
    for (let i = 0; i < total; i++) {
      ctx.fillStyle = i <= sceneIdx ? "#fff" : "rgba(255,255,255,0.4)";
      ctx.fillRect(startX + i * (dotW + dotGap), h * 0.04, dotW, 4);
    }
  }

  // Per-scene loop using rAF for smooth fps
  const totalScenes = storyboard.scenes.length;
  const startTs = performance.now();
  let sceneStart = startTs;
  for (let i = 0; i < totalScenes; i++) {
    const scene = storyboard.scenes[i];
    const dur = (scene.durationSec ?? 4) * 1000;
    sceneStart = performance.now();
    await new Promise<void>(resolve => {
      function frame() {
        const t = performance.now() - sceneStart;
        drawScene(imgs[i], scene, t, dur, true, i, totalScenes);
        if (t >= dur) return resolve();
        requestAnimationFrame(frame);
      }
      frame();
    });
  }

  rec.stop();
  await stopped;
  const blob = new Blob(chunks, { type: mime });
  return URL.createObjectURL(blob);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  // shadow for readability
  ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 8;
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
  ctx.shadowBlur = 0;
}
