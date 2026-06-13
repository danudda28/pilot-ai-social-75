import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalIcon, ChevronDown, AlertCircle, Image as ImageIcon } from "lucide-react";
import { PublishActions } from "@/components/PublishActions";
import { useServerFn } from "@tanstack/react-start";
import { getPostImageUrl } from "@/lib/image.functions";

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

function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("generated_posts").select("*").eq("user_id", user.id)
        .order("scheduled_date", { ascending: true, nullsFirst: false });
      setPosts((data ?? []) as Post[]);
    })();
  }, []);

  const filtered = filter === "all" ? posts : posts.filter(p => p.status === filter);

  const grouped = filtered.reduce<Record<string, Post[]>>((acc, p) => {
    const d = p.scheduled_date ?? p.published_at ?? p.created_at;
    const day = new Date(d).toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    acc[day] = acc[day] || []; acc[day].push(p); return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CalIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Calendar editorial</h1>
          <p className="text-muted-foreground mt-1">Postările tale, ordonate cronologic.</p>
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

      {Object.keys(grouped).length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
          Nicio postare pentru filtrul curent.
        </div>
      ) : (
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
      )}
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
