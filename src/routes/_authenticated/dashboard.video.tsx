import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Video, Sparkles, Loader2, Download, Play, Pause, Wand2, FileText, Hash, Film, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { generateVideoStoryboard, generateSceneClip, generateVoiceover } from "@/lib/video.functions";

export const Route = createFileRoute("/_authenticated/dashboard/video")({
  head: () => ({ meta: [{ title: "AI Video & Reels — Social Spark" }] }),
  component: VideoPage,
});

type Scene = {
  caption: string;
  imagePrompt: string;
  durationSec: number;
  signedUrl?: string;
  path?: string;
  videoUrl?: string;
  videoPath?: string;
  videoStatus?: "idle" | "loading" | "ready" | "error";
};
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

const VOICES = [
  { id: "alloy", label: "Alloy (neutru)" },
  { id: "nova", label: "Nova (feminin energic)" },
  { id: "shimmer", label: "Shimmer (feminin cald)" },
  { id: "onyx", label: "Onyx (masculin grav)" },
  { id: "echo", label: "Echo (masculin neutru)" },
  { id: "fable", label: "Fable (povestitor)" },
] as const;

function VideoPage() {
  const generate = useServerFn(generateVideoStoryboard);
  const genClip = useServerFn(generateSceneClip);
  const genVoice = useServerFn(generateVoiceover);

  const [topic, setTopic] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>("prietenos");
  const [format, setFormat] = useState<"reel" | "square">("reel");
  const [scenes, setScenes] = useState(4);
  const [voice, setVoice] = useState<(typeof VOICES)[number]["id"]>("nova");

  const [loading, setLoading] = useState(false);
  const [storyboard, setStoryboard] = useState<Storyboard | null>(null);
  const [folder, setFolder] = useState<string>("");
  const [renderingClips, setRenderingClips] = useState(false);
  const [renderingVoice, setRenderingVoice] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);

  async function onGenerate() {
    if (!topic.trim() || !businessType.trim()) {
      toast.error("Completează subiectul și tipul de afacere.");
      return;
    }
    setLoading(true);
    setStoryboard(null);
    setVoiceUrl(null);
    setFolder("");
    try {
      const res = await generate({ data: { topic, businessType, tone, format, scenes } });
      const r = res as { storyboard: Storyboard; failedCount: number; folder: string };
      const sb: Storyboard = {
        ...r.storyboard,
        scenes: r.storyboard.scenes.map((s) => ({ ...s, videoStatus: "idle" as const })),
      };
      setStoryboard(sb);
      setFolder(r.folder);
      if (r.failedCount > 0) toast.warning(`${r.failedCount} imagini nu s-au generat.`);
      else toast.success("Storyboard generat! Apasă „Generează clipuri AI” pentru video real.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Eroare generare.");
    } finally {
      setLoading(false);
    }
  }

  async function onGenerateClips() {
    if (!storyboard || !folder) return;
    setRenderingClips(true);
    toast.info("Se generează clipurile AI (~1–3 min). Procesăm în paralel.");

    // Mark all as loading
    setStoryboard((prev) =>
      prev ? { ...prev, scenes: prev.scenes.map((s) => ({ ...s, videoStatus: s.path ? "loading" : "error" })) } : prev,
    );

    const results = await Promise.allSettled(
      storyboard.scenes.map(async (scene, i) => {
        if (!scene.path) throw new Error("Lipsește imaginea sursă");
        const r = (await genClip({
          data: {
            folder,
            sceneIndex: i,
            imagePath: scene.path,
            motionPrompt: scene.imagePrompt,
          },
        })) as { path: string; signedUrl: string | null };
        return { i, ...r };
      }),
    );

    setStoryboard((prev) => {
      if (!prev) return prev;
      const next = { ...prev, scenes: prev.scenes.map((s) => ({ ...s })) };
      results.forEach((res, i) => {
        if (res.status === "fulfilled" && res.value.signedUrl) {
          next.scenes[i].videoUrl = res.value.signedUrl;
          next.scenes[i].videoPath = res.value.path;
          next.scenes[i].videoStatus = "ready";
        } else {
          next.scenes[i].videoStatus = "error";
        }
      });
      return next;
    });

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const fail = results.length - ok;
    if (ok > 0) toast.success(`${ok} clipuri AI generate.`);
    if (fail > 0) toast.error(`${fail} clipuri au eșuat. Reîncearcă mai târziu.`);
    setRenderingClips(false);
  }

  async function onGenerateVoice() {
    if (!storyboard || !folder) return;
    setRenderingVoice(true);
    try {
      const text = [storyboard.hook, ...storyboard.scenes.map((s) => s.caption), storyboard.cta]
        .filter(Boolean)
        .join(". ");
      const r = (await genVoice({ data: { folder, text, voice } })) as { signedUrl: string | null };
      if (r.signedUrl) {
        setVoiceUrl(r.signedUrl);
        toast.success("Voice-over generat în română.");
      } else throw new Error("Fără URL");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Voice-over eșuat.");
    } finally {
      setRenderingVoice(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Video className="h-7 w-7 text-primary shrink-0" />
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold">AI Video & Reels</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Storyboard + imagini AI + clipuri video reale + voice-over RO, în câteva minute.
          </p>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Subiectul reel-ului</span>
            <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3}
              placeholder="Ex: promovare ofertă toamnă -20% la coafat, weekend-ul acesta"
              className="w-full rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary resize-none" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Tip afacere</span>
            <input value={businessType} onChange={(e) => setBusinessType(e.target.value)}
              placeholder="Ex: salon, restaurant, sală fitness…"
              className="w-full rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <select value={tone} onChange={(e) => setTone(e.target.value as typeof tone)}
                className="rounded-lg bg-input/50 border border-border px-3 py-2 text-sm outline-none">
                {TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}
                className="rounded-lg bg-input/50 border border-border px-3 py-2 text-sm outline-none">
                {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div className="pt-2">
              <span className="text-xs text-muted-foreground">Scene: <b className="text-foreground">{scenes}</b></span>
              <input type="range" min={3} max={6} value={scenes} onChange={(e) => setScenes(parseInt(e.target.value))}
                className="w-full accent-primary" />
            </div>
            <label className="block pt-2">
              <span className="text-xs font-medium text-muted-foreground">Voce pentru voice-over</span>
              <select value={voice} onChange={(e) => setVoice(e.target.value as typeof voice)}
                className="mt-1 w-full rounded-lg bg-input/50 border border-border px-3 py-2 text-sm outline-none">
                {VOICES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </label>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button onClick={onGenerate} disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl gradient-bg glow px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {loading ? "Generăm storyboard + imagini…" : "1. Generează storyboard + imagini"}
          </button>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Consumă 1 generare din planul tău
          </span>
        </div>
      </div>

      {storyboard && (
        <StoryboardPreview
          storyboard={storyboard}
          format={format}
          voiceUrl={voiceUrl}
          renderingClips={renderingClips}
          renderingVoice={renderingVoice}
          onGenerateClips={onGenerateClips}
          onGenerateVoice={onGenerateVoice}
        />
      )}
    </div>
  );
}

function StoryboardPreview({
  storyboard, format, voiceUrl,
  renderingClips, renderingVoice,
  onGenerateClips, onGenerateVoice,
}: {
  storyboard: Storyboard;
  format: "reel" | "square";
  voiceUrl: string | null;
  renderingClips: boolean;
  renderingVoice: boolean;
  onGenerateClips: () => void;
  onGenerateVoice: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const aspect = format === "reel" ? "aspect-[9/16]" : "aspect-square";

  const hasAllClips = storyboard.scenes.every((s) => s.videoStatus === "ready" && s.videoUrl);
  const hasAnyClip = storyboard.scenes.some((s) => s.videoStatus === "ready" && s.videoUrl);

  useEffect(() => {
    if (!playing) return;
    const v = videoRefs.current[activeIdx];
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
      const onEnd = () => setActiveIdx((i) => (i + 1 < storyboard.scenes.length ? i + 1 : -1));
      v.addEventListener("ended", onEnd);
      return () => v.removeEventListener("ended", onEnd);
    }
  }, [activeIdx, playing, storyboard.scenes.length]);

  useEffect(() => {
    if (activeIdx === -1) {
      setPlaying(false);
      setActiveIdx(0);
      audioRef.current?.pause();
    }
  }, [activeIdx]);

  function startPlay() {
    setPlaying(true);
    setActiveIdx(0);
    if (audioRef.current && voiceUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }
  function stopPlay() {
    setPlaying(false);
    videoRefs.current.forEach((v) => v?.pause());
    audioRef.current?.pause();
  }

  function copyCaption() {
    navigator.clipboard.writeText(`${storyboard.fullCaption}\n\n${storyboard.hashtags.join(" ")}`);
    toast.success("Caption + hashtaguri copiate.");
  }

  const active = storyboard.scenes[activeIdx >= 0 ? activeIdx : 0];

  return (
    <div className="space-y-5">
      {/* AI Video + Voice actions */}
      <div className="glass-strong rounded-2xl p-4 sm:p-5 flex flex-wrap gap-3 items-center">
        <button onClick={onGenerateClips} disabled={renderingClips || hasAllClips}
          className="inline-flex items-center gap-2 rounded-xl gradient-bg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {renderingClips ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
          {hasAllClips ? "Clipuri AI gata ✓" : renderingClips ? "Generăm clipuri AI…" : "2. Generează clipuri AI (Replicate)"}
        </button>
        <button onClick={onGenerateVoice} disabled={renderingVoice}
          className="inline-flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-semibold hover:bg-secondary disabled:opacity-50">
          {renderingVoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
          {voiceUrl ? "Voice-over regenerează" : renderingVoice ? "Generăm voce…" : "3. Generează voice-over RO"}
        </button>
        {voiceUrl && (
          <audio ref={audioRef} src={voiceUrl} controls className="h-9 ml-auto max-w-[260px]" />
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-5">
        <div className="glass-strong rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Preview</p>
              <h3 className="font-display text-lg font-bold truncate">{storyboard.title}</h3>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={playing ? stopPlay : startPlay} disabled={!hasAnyClip}
                className="inline-flex items-center gap-1.5 rounded-lg glass px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50">
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pauză" : "Redă video real"}
              </button>
            </div>
          </div>

          <div className={`relative mx-auto w-full max-w-[360px] ${aspect} rounded-xl overflow-hidden bg-black border border-border/40`}>
            {storyboard.scenes.map((s, i) => (
              <div key={i} className={`absolute inset-0 transition-opacity duration-300 ${i === activeIdx ? "opacity-100" : "opacity-0"}`}>
                {s.videoUrl ? (
                  <video
                    ref={(el) => { videoRefs.current[i] = el; }}
                    src={s.videoUrl}
                    className="w-full h-full object-cover"
                    muted={!!voiceUrl}
                    playsInline
                    preload="auto"
                  />
                ) : s.signedUrl ? (
                  <img src={s.signedUrl} alt="" className="w-full h-full object-cover" />
                ) : null}
                {s.videoStatus === "loading" && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 text-white text-xs">
                    <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generăm clip AI…</div>
                  </div>
                )}
              </div>
            ))}
            <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/70 to-transparent">
              <p className="text-white font-display text-sm font-bold drop-shadow">{storyboard.hook}</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent space-y-1">
              <p className="text-white text-sm font-medium drop-shadow">{active?.caption}</p>
              <p className="text-white/70 text-[10px]">Scena {Math.max(activeIdx, 0) + 1} / {storyboard.scenes.length}</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Final: <span className="text-foreground font-medium">{storyboard.cta}</span>
          </p>
        </div>

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
              {storyboard.hashtags.map((h) => (
                <span key={h} className="text-[11px] glass rounded-full px-2 py-0.5">{h}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-5 space-y-3">
        <h4 className="font-semibold text-sm">Storyboard ({storyboard.scenes.length} scene)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {storyboard.scenes.map((s, i) => (
            <div key={i} className="glass rounded-xl overflow-hidden border border-border/40">
              <div className={`${format === "reel" ? "aspect-[9/16]" : "aspect-square"} bg-black relative`}>
                {s.videoUrl ? (
                  <video src={s.videoUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                ) : s.signedUrl ? (
                  <img src={s.signedUrl} alt={`Scena ${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">Indisponibil</div>
                )}
                <span className="absolute top-2 left-2 text-[10px] bg-black/60 text-white rounded px-1.5 py-0.5">
                  #{i + 1} {s.videoStatus === "ready" ? "• AI video" : s.videoStatus === "loading" ? "• rendering…" : ""}
                </span>
                {s.videoUrl && (
                  <a href={s.videoUrl} download={`scene-${i + 1}.mp4`}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded p-1 hover:bg-black/80" aria-label="Descarcă clip">
                    <Download className="h-3 w-3" />
                  </a>
                )}
              </div>
              <p className="p-2 text-xs text-muted-foreground line-clamp-3">{s.caption}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tip: descarcă clipurile individuale + voice-over.mp3 și combină-le în CapCut/InShot pentru montaj final (sau le poți publica și ca Carousel Reel).
        </p>
      </div>
    </div>
  );
}
