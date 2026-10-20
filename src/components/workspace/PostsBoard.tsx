import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock, CheckCircle2, Download, Facebook, Instagram, Lock, Pencil, Play, RotateCcw, Send, Sparkles, Trash2, TriangleAlert, X,
} from "lucide-react";
import type { WorkspacePost } from "@/lib/workspace.functions";

export type Target = { target_id: string; platform: "facebook" | "instagram"; account_name: string };

function statusBadge(p: WorkspacePost) {
  if (p.state === "creating") return { label: "Se creează", cls: "bg-primary/12 text-primary" };
  if (p.state === "failed") return { label: "Eșuat", cls: "bg-destructive/12 text-destructive" };
  if (p.status === "published") return { label: "Publicat", cls: "bg-success/15 text-success" };
  if (p.status === "scheduled") return { label: "Programat", cls: "bg-accent/15 text-accent" };
  if (p.status === "failed") return { label: "Publicare eșuată", cls: "bg-destructive/12 text-destructive" };
  if (p.scheduledAt) return { label: "Planificat", cls: "bg-secondary text-foreground/70" };
  return { label: "Draft", cls: "bg-secondary text-muted-foreground" };
}

export function PostsGrid(props: {
  posts: WorkspacePost[];
  placeholders: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const cells = Math.max(9, Math.ceil((props.posts.length + props.placeholders) / 3) * 3);
  const empties = cells - props.posts.length - props.placeholders;
  return (
    <div className="rounded-[28px] border border-border bg-card/70 p-3 shadow-[0_30px_80px_-50px_oklch(0.3_0.1_280/40%)] backdrop-blur-xl">
      <motion.div layout className="grid grid-cols-3 gap-2">
        <AnimatePresence initial={false}>
          {Array.from({ length: props.placeholders }).map((_, i) => (
            <motion.div
              key={`ph-${i}`}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary"
            >
              <Shimmer />
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <motion.div animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.15, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    <Sparkles className="mx-auto h-5 w-5 text-primary" />
                  </motion.div>
                  <p className="mt-1 text-[10px] font-medium text-muted-foreground">Se creează…</p>
                </div>
              </div>
            </motion.div>
          ))}
          {props.posts.map((p) => {
            const on = p.id === props.selectedId;
            const badge = statusBadge(p);
            return (
              <motion.button
                key={p.id}
                layout
                type="button"
                initial={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -3 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                onClick={() => props.onSelect(p.id)}
                className={`group relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary text-left ring-offset-2 ring-offset-card transition-shadow ${
                  on ? "ring-2 ring-primary shadow-lg shadow-primary/25" : "hover:shadow-md"
                }`}
              >
                {p.state === "creating" ? (
                  <>
                    <Shimmer />
                    <div className="absolute inset-0 grid place-items-center">
                      <p className="text-[10px] font-medium text-muted-foreground">Filmez reelul…</p>
                    </div>
                  </>
                ) : p.mediaUrl && p.kind === "video" ? (
                  <video src={`${p.mediaUrl}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : p.mediaUrl ? (
                  <img src={p.mediaUrl} alt={p.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="grid h-full place-items-center text-[10px] text-muted-foreground">Fără media</div>
                )}
                {p.kind === "video" && p.state === "ready" && (
                  <span className="absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                )}
                <span className={`absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[9px] font-semibold backdrop-blur ${badge.cls}`}>
                  {badge.label}
                </span>
              </motion.button>
            );
          })}
          {Array.from({ length: empties }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-[4/5] rounded-2xl bg-secondary/50" />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function Shimmer() {
  return (
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10"
      animate={{ x: ["-100%", "100%"] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function PostPreview(props: {
  post: WorkspacePost;
  isFree: boolean;
  busy: boolean;
  onSaveText: (caption: string, hashtags: string) => Promise<void>;
  onEdit: () => void;
  onPublish: () => void;
  onDelete: () => void;
  onRetryVideo: () => void;
  onUpgrade: () => void;
}) {
  const { post } = props;
  const [flipped, setFlipped] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [hashtags, setHashtags] = useState(post.hashtags);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setFlipped(false);
    setCaption(post.caption);
    setHashtags(post.hashtags);
    setLocked(false);
  }, [post.id, post.caption, post.hashtags]);

  const dirty = caption !== post.caption || hashtags !== post.hashtags;
  const badge = statusBadge(post);

  return (
    <div className="flex w-full max-w-[380px] flex-col gap-3">
      <div className="[perspective:1600px]">
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 20 }}
          className="relative aspect-[9/16] w-full [transform-style:preserve-3d]"
        >
          <div className="absolute inset-0 overflow-hidden rounded-[28px] bg-black shadow-[0_40px_90px_-30px_oklch(0.25_0.12_280/60%)] [backface-visibility:hidden]">
            {post.state === "creating" ? (
              <div className="relative grid h-full place-items-center bg-gradient-to-br from-primary/30 via-accent/20 to-background">
                <Shimmer />
                <div className="relative text-center text-white">
                  <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 1.8, repeat: Infinity }}>
                    <Sparkles className="mx-auto h-8 w-8" />
                  </motion.div>
                  <p className="mt-3 text-sm font-medium">Spark filmează reelul…</p>
                  <p className="mt-1 text-xs opacity-70">De obicei durează 2–6 minute</p>
                </div>
              </div>
            ) : post.state === "failed" ? (
              <div className="grid h-full place-items-center bg-gradient-to-br from-destructive/25 to-background p-6 text-center text-white">
                <div>
                  <TriangleAlert className="mx-auto h-7 w-7" />
                  <p className="mt-3 text-sm font-medium">Clipul nu s-a generat</p>
                  <button type="button" onClick={props.onRetryVideo} disabled={props.busy} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-50">
                    <RotateCcw className="h-3.5 w-3.5" /> Încearcă din nou
                  </button>
                </div>
              </div>
            ) : post.kind === "video" && post.mediaUrl ? (
              <>
                <video
                  ref={videoRef}
                  key={post.mediaUrl}
                  src={post.mediaUrl}
                  className="h-full w-full object-cover"
                  controls={!locked}
                  playsInline
                  autoPlay
                  muted
                  onTimeUpdate={(e) => {
                    const v = e.currentTarget;
                    if (props.isFree && v.duration && v.currentTime / v.duration > 0.7) {
                      v.pause();
                      setLocked(true);
                    }
                  }}
                />
                <AnimatePresence>
                  {locked && (
                    <motion.div
                      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                      animate={{ opacity: 1, backdropFilter: "blur(14px)" }}
                      className="absolute inset-0 grid place-items-center bg-black/40 p-6 text-center text-white"
                    >
                      <div>
                        <Lock className="mx-auto h-7 w-7" />
                        <p className="mt-3 font-display text-lg font-semibold">Deblochează reelul complet</p>
                        <p className="mt-1 text-xs opacity-80">Alege un abonament ca să vezi finalul și să-l publici.</p>
                        <button type="button" onClick={props.onUpgrade} className="mt-4 rounded-full bg-gradient-to-r from-primary to-accent px-5 py-2.5 text-sm font-semibold shadow-lg">
                          Vezi abonamentele
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : post.mediaUrl ? (
              <img src={post.mediaUrl} alt={post.title} className="h-full w-full object-cover" />
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur ${badge.cls}`}>{badge.label}</span>
            </div>
            <button
              type="button"
              onClick={() => setFlipped(true)}
              className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-black shadow backdrop-blur hover:bg-white"
            >
              Descriere ↻
            </button>
          </div>

          <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[28px] border border-border bg-card p-4 shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-sm font-semibold">Descriere</p>
              <button type="button" onClick={() => setFlipped(false)} className="rounded-full p-1.5 hover:bg-secondary" aria-label="Înapoi">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-2 line-clamp-2 text-xs font-medium text-muted-foreground">{post.title}</p>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-0 flex-1 resize-none rounded-xl border border-input bg-background p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="mt-2 rounded-xl border border-input bg-background px-3 py-2 text-xs text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCaption(post.caption);
                  setHashtags(post.hashtags);
                }}
                disabled={!dirty}
                className="flex-1 rounded-xl border border-border py-2 text-xs font-medium disabled:opacity-40"
              >
                Anulează
              </button>
              <button
                type="button"
                disabled={!dirty || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await props.onSaveText(caption, hashtags);
                  } finally {
                    setSaving(false);
                  }
                }}
                className="flex-1 rounded-xl bg-foreground py-2 text-xs font-semibold text-background disabled:opacity-40"
              >
                {saving ? "Se salvează…" : "Salvează"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {post.error && post.status !== "published" && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{post.error}</p>
      )}
      {post.scheduledAt && post.status !== "published" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {post.status === "scheduled" ? "Se publică" : "Planificat"} {new Date(post.scheduledAt).toLocaleString("ro-RO", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
      {post.status === "published" && post.publishedAt && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Publicat {new Date(post.publishedAt).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      )}

      <div className="grid grid-cols-4 gap-2">
        <ActionBtn icon={Pencil} label="Editează" onClick={props.onEdit} disabled={props.busy || post.state !== "ready"} />
        <ActionBtn
          icon={Download}
          label="Descarcă"
          href={post.mediaUrl ?? undefined}
          download={post.kind === "video" ? "reel.mp4" : "postare.png"}
          disabled={!post.mediaUrl || (props.isFree && post.kind === "video")}
        />
        <ActionBtn icon={Trash2} label="Șterge" onClick={props.onDelete} disabled={props.busy} />
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={props.onPublish}
          disabled={props.busy || post.state !== "ready" || post.status === "published"}
          className="col-span-1 flex flex-col items-center justify-center gap-1 rounded-2xl bg-gradient-to-br from-primary to-accent py-2.5 text-[11px] font-semibold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          Publică
        </motion.button>
      </div>
    </div>
  );
}

function ActionBtn(props: {
  icon: typeof Pencil;
  label: string;
  onClick?: () => void;
  href?: string;
  download?: string;
  disabled?: boolean;
}) {
  const cls =
    "flex flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card py-2.5 text-[11px] font-medium hover:bg-secondary aria-disabled:pointer-events-none aria-disabled:opacity-40 disabled:opacity-40";
  if (props.href) {
    return (
      <a href={props.href} download={props.download} aria-disabled={props.disabled} className={cls}>
        <props.icon className="h-4 w-4" />
        {props.label}
      </a>
    );
  }
  return (
    <button type="button" onClick={props.onClick} disabled={props.disabled} className={cls}>
      <props.icon className="h-4 w-4" />
      {props.label}
    </button>
  );
}

export function Modal(props: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {props.open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={props.onClose} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative w-full max-w-md rounded-[28px] border border-border bg-card p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{props.title}</h3>
              <button type="button" onClick={props.onClose} className="rounded-full p-1.5 hover:bg-secondary" aria-label="Închide">
                <X className="h-4 w-4" />
              </button>
            </div>
            {props.children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function EditDialog(props: {
  post: WorkspacePost | null;
  onClose: () => void;
  onSubmit: (instruction: string) => void;
}) {
  const [text, setText] = useState("");
  useEffect(() => setText(""), [props.post?.id]);
  const isVideo = props.post?.kind === "video";
  return (
    <Modal open={!!props.post} onClose={props.onClose} title={isVideo ? "Ce schimbăm la reel?" : "Ce schimbăm la imagine?"}>
      <p className="mb-3 text-sm text-muted-foreground">
        {isVideo
          ? "Poți cere modificări la scenariu, voce, cadre, subtitrări sau atmosferă. Fii cât mai clar — Spark refilmează reelul păstrând produsul identic."
          : "Spune exact ce să schimbe (lumină, fundal, text pe imagine, culori). Produsul rămâne identic."}
      </p>
      <textarea
        autoFocus
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isVideo ? "Ex: vreau o voce mai energică și un final cu oferta de 10% la brunch" : "Ex: fundal mai luminos, adaugă textul „Brunch în weekend”"}
        className="w-full resize-none rounded-2xl border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        disabled={text.trim().length < 3}
        onClick={() => props.onSubmit(text.trim())}
        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-40"
      >
        {isVideo ? "Refilmează reelul" : "Aplică modificarea"}
      </button>
    </Modal>
  );
}

export function PublishDialog(props: {
  post: WorkspacePost | null;
  targets: Target[];
  busy: boolean;
  onClose: () => void;
  onConnect: () => void;
  onSubmit: (targets: string[], when: string | null) => void;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"now" | "later">("now");
  const [when, setWhen] = useState("");

  useEffect(() => {
    if (!props.post) return;
    setSel(new Set(props.targets.map((t) => t.target_id)));
    setMode("now");
    const d = new Date(Date.now() + 24 * 3600_000);
    d.setHours(10, 0, 0, 0);
    setWhen(toLocalInput(d));
  }, [props.post?.id, props.targets.length]);

  return (
    <Modal open={!!props.post} onClose={props.onClose} title="Publică postarea">
      {props.targets.length === 0 ? (
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Conectează pagina de Facebook (și contul de Instagram, dacă îl ai) ca Spark să publice automat.</p>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>Instagram trebuie să fie cont profesional (Business sau Creator).</li>
            <li>Contul de Instagram trebuie legat de pagina de Facebook.</li>
            <li>Accepți toate permisiunile cerute de Meta.</li>
          </ol>
          <button type="button" onClick={props.onConnect} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1877F2] py-3 text-sm font-semibold text-white">
            <Facebook className="h-4 w-4" /> Conectează Facebook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {props.targets.map((t) => {
              const on = sel.has(t.target_id);
              const Icon = t.platform === "instagram" ? Instagram : Facebook;
              return (
                <button
                  key={t.target_id}
                  type="button"
                  onClick={() => {
                    const n = new Set(sel);
                    n.has(t.target_id) ? n.delete(t.target_id) : n.add(t.target_id);
                    setSel(n);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm transition ${
                    on ? "border-primary bg-primary/8" : "border-border"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${t.platform === "instagram" ? "text-pink-500" : "text-[#1877F2]"}`} />
                  <span className="flex-1 truncate">{t.account_name}</span>
                  <span className={`h-4 w-4 rounded-full border-2 ${on ? "border-primary bg-primary" : "border-border"}`} />
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1">
            {(["now", "later"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`relative rounded-xl py-2 text-xs font-semibold ${mode === m ? "text-foreground" : "text-muted-foreground"}`}
              >
                {mode === m && <motion.span layoutId="pubmode" className="absolute inset-0 rounded-xl bg-card shadow" />}
                <span className="relative">{m === "now" ? "Acum" : "Programează"}</span>
              </button>
            ))}
          </div>
          {mode === "later" && (
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background px-3 py-2.5 text-sm"
            />
          )}
          <button
            type="button"
            disabled={props.busy || sel.size === 0 || (mode === "later" && !when)}
            onClick={() => props.onSubmit(Array.from(sel), mode === "later" ? new Date(when).toISOString() : null)}
            className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 disabled:opacity-40"
          >
            {props.busy ? "Se trimite…" : mode === "now" ? "Publică acum" : "Programează"}
          </button>
        </div>
      )}
    </Modal>
  );
}

export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
