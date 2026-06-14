import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalIcon, ChevronDown, AlertCircle, Image as ImageIcon, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { PublishActions } from "@/components/PublishActions";
import { useServerFn } from "@tanstack/react-start";
import { getPostImageUrl } from "@/lib/image.functions";
import { reschedulePost } from "@/lib/posts.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Social Spark" }] }),
  component: CalendarPage,
});

type Post = {
  id: string; title: string | null; platform: string; status: string;
  scheduled_date: string | null; created_at: string; published_at: string | null;
  last_publish_error: string | null; image_url: string | null; copy: string | null;
};

const FILTERS = [
  { v: "all", l: "Toate" },
  { v: "scheduled", l: "Programate" },
  { v: "published", l: "Publicate" },
  { v: "failed", l: "Eșuate" },
  { v: "draft", l: "Drafturi" },
];

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });
  const [dragOver, setDragOver] = useState<string | null>(null);
  const reschedule = useServerFn(reschedulePost);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("generated_posts").select("*").eq("user_id", user.id)
      .order("scheduled_date", { ascending: true, nullsFirst: false });
    setPosts((data ?? []) as Post[]);
  }

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? posts : posts.filter(p => p.status === filter);

  async function handleDrop(postId: string, targetDay: Date) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const base = post.scheduled_date ? new Date(post.scheduled_date) : new Date();
    const newDate = new Date(targetDay);
    newDate.setHours(base.getHours() || 10, base.getMinutes() || 0, 0, 0);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, scheduled_date: newDate.toISOString(), status: "scheduled" } : p));
    try {
      await reschedule({ data: { postId, scheduledDate: newDate.toISOString() } });
      toast.success("Postare reprogramată");
    } catch (e: any) {
      toast.error(e.message ?? "Eroare la reprogramare");
      load();
    }
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekLabel = `${weekStart.toLocaleDateString("ro-RO", { day: "numeric", month: "short" })} – ${addDays(weekStart, 6).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}`;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <CalIcon className="h-7 w-7 text-primary" />
          <div>
            <h1 className="font-display text-3xl font-bold">Calendar editorial</h1>
            <p className="text-muted-foreground mt-1">Trage postările între zile ca să le reprogramezi.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView("week")} className={`rounded-lg px-3 py-1.5 text-xs border ${view === "week" ? "border-primary bg-primary/10" : "border-border/60 text-muted-foreground"}`}>Săptămână</button>
          <button onClick={() => setView("list")} className={`rounded-lg px-3 py-1.5 text-xs border ${view === "list" ? "border-primary bg-primary/10" : "border-border/60 text-muted-foreground"}`}>Listă</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`rounded-lg px-3 py-1.5 text-xs border transition-colors ${
              filter === f.v ? "border-primary bg-primary/10 text-foreground"
                : "border-border/60 text-muted-foreground hover:border-border"
            }`}>{f.l}</button>
        ))}
      </div>

      {view === "week" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between glass rounded-xl p-3">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="rounded-md p-1.5 hover:bg-secondary"><ChevronLeft className="h-4 w-4" /></button>
            <div className="text-sm font-medium">{weekLabel}</div>
            <div className="flex gap-2">
              <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="text-xs px-2 py-1 rounded-md border border-border/60 hover:bg-secondary">Azi</button>
              <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="rounded-md p-1.5 hover:bg-secondary"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {days.map(day => {
              const dayPosts = filtered.filter(p => {
                const d = p.scheduled_date ?? p.published_at;
                return d ? sameDay(new Date(d), day) : false;
              });
              const key = day.toISOString();
              const isToday = sameDay(day, new Date());
              return (
                <div
                  key={key}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(key); }}
                  onDragLeave={() => setDragOver(prev => prev === key ? null : prev)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const id = e.dataTransfer.getData("text/plain");
                    if (id) handleDrop(id, day);
                  }}
                  className={`glass rounded-xl p-2 min-h-[180px] flex flex-col gap-2 transition-colors ${
                    dragOver === key ? "border-primary/60 bg-primary/5" : ""
                  } ${isToday ? "ring-1 ring-primary/40" : ""}`}
                >
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 flex items-center justify-between">
                    <span>{day.toLocaleDateString("ro-RO", { weekday: "short" })}</span>
                    <span className={`font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>{day.getDate()}</span>
                  </div>
                  {dayPosts.length === 0 && (
                    <div className="text-[10px] text-muted-foreground/60 text-center py-4">—</div>
                  )}
                  {dayPosts.map(p => (
                    <DragPostCard key={p.id} post={p} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <ListView posts={filtered} />
      )}
    </div>
  );
}

function DragPostCard({ post }: { post: Post }) {
  const time = post.scheduled_date
    ? new Date(post.scheduled_date).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
    : null;
  const statusColor: Record<string, string> = {
    scheduled: "border-l-primary",
    published: "border-l-green-500",
    failed: "border-l-destructive",
    draft: "border-l-muted-foreground",
  };
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", post.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={`group cursor-grab active:cursor-grabbing rounded-md bg-background/40 border border-border/40 border-l-2 ${statusColor[post.status] ?? statusColor.draft} px-2 py-1.5 text-xs hover:bg-secondary/40 transition-colors`}
      title={post.title ?? "(fără titlu)"}
    >
      <div className="flex items-center gap-1">
        <GripVertical className="h-3 w-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 shrink-0" />
        <span className="font-medium truncate">{post.title ?? "(fără titlu)"}</span>
      </div>
      <div className="text-[10px] text-muted-foreground capitalize mt-0.5">
        {post.platform}{time ? ` · ${time}` : ""}
      </div>
    </div>
  );
}

function ListView({ posts }: { posts: Post[] }) {
  const grouped = posts.reduce<Record<string, Post[]>>((acc, p) => {
    const d = p.scheduled_date ?? p.published_at ?? p.created_at;
    const day = new Date(d).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    acc[day] = acc[day] || []; acc[day].push(p); return acc;
  }, {});

  if (Object.keys(grouped).length === 0) {
    return <div className="glass rounded-2xl p-10 text-center text-muted-foreground">Nicio postare pentru filtrul curent.</div>;
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([day, ps]) => (
        <div key={day}>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{day}</div>
          <div className="space-y-2">
            {ps.map(p => <PostRow key={p.id} post={p} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function PostRow({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const fetchImg = useServerFn(getPostImageUrl);

  useEffect(() => {
    if (open && post.image_url && !imgUrl) {
      fetchImg({ data: { path: post.image_url } })
        .then(r => setImgUrl(r.signedUrl))
        .catch(() => {});
    }
  }, [open, post.image_url]);

  const time = post.scheduled_date
    ? new Date(post.scheduled_date).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02]">
        <div className="flex items-center gap-3 min-w-0">
          {post.image_url ? (
            <div className="h-10 w-10 rounded-lg bg-secondary/40 grid place-items-center shrink-0">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          ) : null}
          <div className="min-w-0">
            <div className="font-medium truncate">{post.title ?? "(fără titlu)"}</div>
            <div className="text-xs text-muted-foreground capitalize flex items-center gap-2 flex-wrap mt-0.5">
              <span>{post.platform}</span>
              <span>·</span>
              <StatusBadge status={post.status} />
              {time && <><span>·</span><span>{time}</span></>}
            </div>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border/40 p-4 space-y-4">
          {imgUrl && <img src={imgUrl} alt="" className="w-full max-w-sm rounded-lg" />}
          {post.copy && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{post.copy}</p>
          )}
          {post.last_publish_error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{post.last_publish_error}</span>
            </div>
          )}
          {post.status !== "published" && (
            <PublishActions postId={post.id} defaultPlatform={post.platform} />
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-primary/20 text-primary",
    published: "bg-green-500/20 text-green-400",
    failed: "bg-destructive/20 text-destructive",
  };
  const labels: Record<string, string> = {
    draft: "Draft", scheduled: "Programată", published: "Publicată", failed: "Eșuată",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] ${map[status] ?? map.draft}`}>{labels[status] ?? status}</span>;
}
