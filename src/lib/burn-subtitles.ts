/**
 * Burns subtitle lines into a video in the browser (canvas + MediaRecorder), keeping the clip's audio.
 * Lines are spread evenly over the clip. Returns null when the browser cannot record MP4,
 * so callers keep the clean clip instead of publishing a format Instagram rejects.
 */

const MP4_TYPES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4",
];

export function canBurnSubtitles(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    MP4_TYPES.some((t) => MediaRecorder.isTypeSupported(t))
  );
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function drawSubtitle(ctx: CanvasRenderingContext2D, W: number, H: number, text: string, age: number, left: number) {
  const fontSize = Math.round(W * 0.062);
  ctx.font = `800 ${fontSize}px "Plus Jakarta Sans", Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = wrap(ctx, text, W * 0.8);
  const lineH = fontSize * 1.22;
  const padX = fontSize * 0.55;
  const padY = fontSize * 0.38;
  const boxW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + padX * 2;
  const boxH = lines.length * lineH + padY * 2;
  const cx = W / 2;
  const cy = H * 0.7;

  const enter = Math.min(1, age / 0.28);
  const exit = Math.min(1, left / 0.18);
  const scale = 0.86 + 0.14 * easeOutBack(enter);
  ctx.save();
  ctx.globalAlpha = Math.min(enter * 1.6, 1) * exit;
  ctx.translate(cx, cy + (1 - enter) * fontSize * 0.6);
  ctx.scale(scale, scale);

  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = fontSize * 0.6;
  ctx.shadowOffsetY = fontSize * 0.12;
  ctx.fillStyle = "rgba(10, 14, 22, 0.78)";
  roundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, fontSize * 0.45);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  lines.forEach((l, i) => {
    ctx.fillText(l, 0, -boxH / 2 + padY + lineH * (i + 0.5));
  });
  ctx.restore();
}

export async function burnSubtitles(videoUrl: string, lines: string[]): Promise<Blob | null> {
  const subtitles = lines.map((l) => l.trim()).filter(Boolean);
  const mimeType = MP4_TYPES.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
  if (!subtitles.length || !mimeType) return null;

  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.preload = "auto";
  video.src = videoUrl;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Clipul nu a putut fi încărcat pentru subtitrare."));
  });

  const W = video.videoWidth || 720;
  const H = video.videoHeight || 1280;
  // Some servers report Infinity until the file is fully read.
  const clipDuration = () => (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 8);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  await document.fonts?.ready;

  const stream = canvas.captureStream(30);
  const audioCtx = new AudioContext();
  await audioCtx.resume().catch(() => {});
  const source = audioCtx.createMediaElementSource(video);
  const dest = audioCtx.createMediaStreamDestination();
  source.connect(dest);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/mp4" }));
  });

  // A hidden tab stops animation frames, which would freeze the recording, so that run is discarded.
  let interrupted = document.hidden;
  const onVisibility = () => {
    if (document.hidden) interrupted = true;
  };
  document.addEventListener("visibilitychange", onVisibility);

  let raf = 0;
  const draw = () => {
    ctx.drawImage(video, 0, 0, W, H);
    const t = video.currentTime;
    const slot = clipDuration() / subtitles.length;
    const i = Math.min(subtitles.length - 1, Math.floor(t / slot));
    const start = i * slot;
    drawSubtitle(ctx, W, H, subtitles[i], t - start, start + slot - t);
    if (!video.ended) raf = requestAnimationFrame(draw);
  };

  recorder.start(250);
  await video.play();
  draw();
  await new Promise<void>((resolve) => {
    video.onended = () => resolve();
  });
  cancelAnimationFrame(raf);
  recorder.stop();
  const blob = await done;
  document.removeEventListener("visibilitychange", onVisibility);
  stream.getTracks().forEach((t) => t.stop());
  await audioCtx.close().catch(() => {});
  if (interrupted) return null;
  return blob.size > 0 ? blob : null;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
