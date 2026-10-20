import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, GripVertical, Play } from "lucide-react";
import type { WorkspacePost } from "@/lib/workspace.functions";

const DAYS = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function postDate(p: WorkspacePost) {
  const iso = p.status === "published" ? p.publishedAt ?? p.scheduledAt : p.scheduledAt;
  return iso ? new Date(iso) : null;
}

export function CalendarBoard(props: {
  posts: WorkspacePost[];
  onOpen: (id: string) => void;
  onDropOnDay: (postId: string, day: Date) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dir, setDir] = useState(0);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, WorkspacePost[]>();
    for (const p of props.posts) {
      const d = postDate(p);
      if (!d) continue;
      const k = dayKey(d);
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return m;
  }, [props.posts]);

  const unplanned = props.posts.filter((p) => p.state === "ready" && !p.scheduledAt && p.status !== "published");

  const first = new Date(cursor);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(1 - offset);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const todayKey = dayKey(new Date());
  const monthLabel = cursor.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });

  function shift(n: number) {
    setDir(n);
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));
  }

  return (
    <div className="space-y-3">
      {unplanned.length > 0 && (
        <div className="rounded-[24px] border border-border bg-card/70 p-3 backdrop-blur-xl">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <GripVertical className="h-3.5 w-3.5" /> Trage o postare pe o zi ca s-o programezi
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {unplanned.map((p) => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/post-id", p.id)}
                onClick={() => props.onOpen(p.id)}
                className="relative h-20 w-16 shrink-0 cursor-grab overflow-hidden rounded-xl bg-secondary active:cursor-grabbing"
              >
                <Thumb post={p} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[28px] border border-border bg-card/70 p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-base font-semibold capitalize">{monthLabel}</p>
          <div className="flex gap-1">
            <button type="button" onClick={() => shift(-1)} className="rounded-full p-2 hover:bg-secondary" aria-label="Luna anterioară">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => shift(1)} className="rounded-full p-2 hover:bg-secondary" aria-label="Luna următoare">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {DAYS.map((d) => <div key={d}>{d}</div>)}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={cursor.toISOString()}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-7 gap-1"
          >
            {cells.map((d) => {
              const k = dayKey(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const items = byDay.get(k) ?? [];
              const past = d < new Date(new Date().setHours(0, 0, 0, 0));
              return (
                <div
                  key={k}
                  onDragOver={(e) => {
                    if (past) return;
                    e.preventDefault();
                    setDragOver(k);
                  }}
                  onDragLeave={() => setDragOver((v) => (v === k ? null : v))}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const id = e.dataTransfer.getData("text/post-id");
                    if (id && !past) props.onDropOnDay(id, d);
                  }}
                  className={`min-h-[78px] rounded-xl border p-1 transition ${
                    dragOver === k ? "border-primary bg-primary/8" : "border-transparent bg-secondary/40"
                  } ${inMonth ? "" : "opacity-40"}`}
                >
                  <div className={`mb-1 text-[10px] font-semibold ${k === todayKey ? "inline-grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                    {d.getDate()}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {items.slice(0, 3).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => props.onOpen(p.id)}
                        className={`relative h-9 w-7 overflow-hidden rounded-md ring-1 ${p.status === "published" ? "ring-success" : p.status === "scheduled" ? "ring-accent" : "ring-border"}`}
                      >
                        <Thumb post={p} />
                      </button>
                    ))}
                    {items.length > 3 && <span className="text-[9px] text-muted-foreground">+{items.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
        <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <Legend cls="bg-accent" label="Programat (se publică automat)" />
          <Legend cls="bg-success" label="Publicat" />
          <Legend cls="bg-border" label="Planificat (fără cont conectat)" />
        </div>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${cls}`} />
      {label}
    </span>
  );
}

function Thumb({ post }: { post: WorkspacePost }) {
  if (!post.mediaUrl) return <div className="h-full w-full bg-secondary" />;
  if (post.kind === "video") {
    return (
      <>
        <video src={`${post.mediaUrl}#t=0.5`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        <Play className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 fill-white text-white" />
      </>
    );
  }
  return <img src={post.mediaUrl} alt="" className="h-full w-full object-cover" />;
}
