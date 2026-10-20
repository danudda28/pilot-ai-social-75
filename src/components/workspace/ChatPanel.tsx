import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ImagePlus, Images, Lightbulb, Info, Paperclip, Pencil, Send, Sparkles, Trash2, Video, X, Plug,
} from "lucide-react";
import type { WorkspacePhoto } from "@/lib/workspace.functions";

export type ChatMsg =
  | { id: string; role: "user"; text: string; images?: string[]; ts: number }
  | { id: string; role: "assistant"; text: string; ts: number }
  | { id: string; role: "system"; text: string; tone?: "info" | "success" | "action"; link?: { to: string; label: string }; ts: number };

export type Progress = { stages: string[]; startedAt: number; etaSec: number } | null;

export type QuickAction = "what_can_you_do" | "what_info" | "more_video" | "more_images" | "edit_selected" | "delete_photo";

function hhmm(ts: number) {
  return new Date(ts).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

export function ChatPanel(props: {
  messages: ChatMsg[];
  typing: boolean;
  busy: boolean;
  progress: Progress;
  photos: WorkspacePhoto[];
  hasPosts: boolean;
  onSend: (text: string) => void;
  onFiles: (files: File[]) => void;
  onQuick: (a: QuickAction) => void;
  onDeletePhoto: (path: string) => void;
  onNavigate: (to: string) => void;
}) {
  const [input, setInput] = useState("");
  const [photosOpen, setPhotosOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [props.messages.length, props.typing]);

  function submit() {
    const t = input.trim();
    if (!t || props.busy) return;
    setInput("");
    props.onSend(t);
  }

  const chips: { id: QuickAction; label: string; icon: typeof Video }[] = props.hasPosts
    ? [
        { id: "more_video", label: "Creează încă un reel", icon: Video },
        { id: "more_images", label: "Creează mai multe poze", icon: Images },
        { id: "edit_selected", label: "Editează postarea selectată", icon: Pencil },
        { id: "delete_photo", label: "Șterge o poză încărcată", icon: Trash2 },
      ]
    : [
        { id: "what_can_you_do", label: "Ce poți face pentru afacerea mea?", icon: Lightbulb },
        { id: "what_info", label: "Ce informații îți trebuie?", icon: Info },
      ];

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-border bg-card/80 shadow-[0_30px_80px_-40px_oklch(0.3_0.1_280/45%)] backdrop-blur-xl">
      <header className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
        <div className="relative">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold leading-tight">Spark</p>
          <p className="text-xs text-muted-foreground">{props.typing ? "scrie…" : "Social media managerul tău · online"}</p>
        </div>
        <button
          type="button"
          onClick={() => setPhotosOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-medium hover:bg-secondary"
          aria-label="Pozele tale"
        >
          <Images className="h-3.5 w-3.5" />
          {props.photos.length}
        </button>
      </header>

      <AnimatePresence>
        {props.progress && <ProgressStrip key="progress" progress={props.progress} />}
      </AnimatePresence>

      <AnimatePresence>
        {photosOpen && (
          <motion.div
            key="photos"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border/70 bg-secondary/40"
          >
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold">Pozele tale</p>
                <button type="button" onClick={() => setPhotosOpen(false)} aria-label="Închide pozele" className="rounded-full p-1 hover:bg-background">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {props.photos.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nicio poză încă. Atașează una cu agrafa de jos.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {props.photos.map((p) => (
                    <div key={p.path} className="group relative aspect-square overflow-hidden rounded-xl">
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => props.onDeletePhoto(p.path)}
                        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="Șterge poza"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <AnimatePresence initial={false}>
          {props.messages.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              {m.role === "system" ? (
                <div className="flex justify-center">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium ${
                      m.tone === "success"
                        ? "bg-success/12 text-success"
                        : m.tone === "action"
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {m.tone === "action" ? <Plug className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                    {m.text}
                    {m.link && (
                      <button type="button" onClick={() => props.onNavigate(m.link!.to)} className="ml-1 underline underline-offset-2">
                        {m.link.label}
                      </button>
                    )}
                  </span>
                </div>
              ) : m.role === "user" ? (
                <div className="ml-auto flex max-w-[86%] flex-col items-end gap-1.5">
                  {m.images?.map((src) => (
                    <img key={src} src={src} alt="" className="max-h-56 rounded-2xl rounded-br-md object-cover shadow-md" />
                  ))}
                  {m.text && (
                    <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-gradient-to-br from-primary to-[oklch(0.5_0.2_265)] px-3.5 py-2.5 text-sm text-primary-foreground shadow-md shadow-primary/20">
                      {m.text}
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground">{hhmm(m.ts)}</span>
                </div>
              ) : (
                <div className="flex max-w-[88%] flex-col items-start gap-1">
                  <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-border/70 bg-background px-3.5 py-2.5 text-sm leading-relaxed shadow-sm">
                    {m.text}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{hhmm(m.ts)}</span>
                </div>
              )}
            </motion.div>
          ))}
          {props.typing && (
            <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md border border-border/70 bg-background px-3.5 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                    animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      <div className="space-y-2 border-t border-border/70 p-3">
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <motion.button
              key={c.id}
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              disabled={props.busy}
              onClick={() => props.onQuick(c.id)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              <c.icon className="h-3.5 w-3.5 text-primary" />
              {c.label}
            </motion.button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-2 rounded-2xl border border-border bg-background p-1.5 focus-within:ring-2 focus-within:ring-ring"
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) props.onFiles(files);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={props.busy}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
            aria-label="Atașează poze"
          >
            {props.photos.length ? <Paperclip className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
          </button>
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Scrie-i lui Spark…"
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-1 py-2 text-sm focus:outline-none"
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.92 }}
            disabled={props.busy || !input.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md shadow-primary/30 disabled:opacity-40"
            aria-label="Trimite"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </form>
      </div>
    </section>
  );
}

function ProgressStrip({ progress }: { progress: NonNullable<Progress> }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);
  const elapsed = (now - progress.startedAt) / 1000;
  const pct = Math.min(96, (elapsed / Math.max(1, progress.etaSec)) * 100);
  const stageIdx = Math.min(progress.stages.length - 1, Math.floor((pct / 100) * progress.stages.length));
  const left = Math.max(0, Math.ceil(progress.etaSec - elapsed));
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mx-3 mt-3 overflow-hidden rounded-2xl bg-foreground text-background shadow-lg"
    >
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <motion.div
          className="h-5 w-5 rounded-full border-2 border-background/25 border-t-background"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
        <AnimatePresence mode="wait">
          <motion.p
            key={stageIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex-1 truncate text-xs font-medium"
          >
            {progress.stages[stageIdx]}
          </motion.p>
        </AnimatePresence>
        <span className="text-[11px] tabular-nums opacity-70">
          {left > 60 ? `~${Math.ceil(left / 60)} min` : `~${left}s`}
        </span>
      </div>
      <div className="h-1 bg-background/15">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%]"
          animate={{ width: `${pct}%`, backgroundPosition: ["0% 0%", "200% 0%"] }}
          transition={{ width: { duration: 0.5 }, backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" } }}
        />
      </div>
    </motion.div>
  );
}
