import { MetaHealthAlert } from "@/components/MetaHealthPanel";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getBrandBrain } from "@/lib/brand-brain.functions";
import { PageHeader, Panel, ProgressBar, SkeletonBlock } from "@/components/ui-kit";
import { CheckCircle2, Circle, ArrowRight, Brain, PenSquare, Plug, Calendar, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Acasă — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: DashboardHome,
});

type Post = { id: string; title: string | null; status: string; approval_status: string; scheduled_date: string | null; published_at: string | null; last_publish_error: string | null; created_at: string };

function DashboardHome() {
  const navigate = useNavigate();
  const brainFn = useServerFn(getBrandBrain);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [brain, setBrain] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [metaConnected, setMetaConnected] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [b, prof, meta] = await Promise.all([
        brainFn({ data: {} }).catch(() => null),
        supabase.from("users_profiles").select("full_name,onboarding_completed").eq("user_id", user.id).maybeSingle(),
        supabase.from("meta_connections").select("id").eq("user_id", user.id).limit(1),
      ]);
      if (b && !prof.data?.onboarding_completed && !b.brand.onboarding_completed_at) {
        navigate({ to: "/dashboard/onboarding" });
        return;
      }
      setBrain(b);
      setName(prof.data?.full_name?.split(" ")[0] ?? "");
      setMetaConnected((meta.data?.length ?? 0) > 0);
      if (b) {
        const { data: ps } = await supabase.from("generated_posts")
          .select("id,title,status,approval_status,scheduled_date,published_at,last_publish_error,created_at")
          .eq("brand_id", b.brand.id).order("created_at", { ascending: false }).limit(200);
        setPosts((ps ?? []) as Post[]);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-9 w-64" />
        <div className="grid gap-4 md:grid-cols-3"><SkeletonBlock className="h-40" /><SkeletonBlock className="h-40" /><SkeletonBlock className="h-40" /></div>
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const published = posts.filter(p => p.status === "published" && p.published_at && new Date(p.published_at) >= monthStart).length;
  const scheduled = posts.filter(p => p.status === "scheduled").length;
  const drafts = posts.filter(p => p.status === "draft").length;
  const failed = posts.filter(p => p.last_publish_error && p.status !== "published");
  const nextPosts = posts.filter(p => p.status === "scheduled" && p.scheduled_date)
    .sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!)).slice(0, 4);
  const score = brain?.completeness.score ?? 0;

  const checklist = [
    { label: "Completează datele afacerii", done: !!brain?.brand.category, to: "/dashboard/onboarding" },
    { label: "Confirmă informațiile din Brand Brain (minim 70%)", done: score >= 70, to: "/dashboard/brand-brain" },
    { label: "Setează tonul și vocea brandului", done: !!brain?.voice, to: "/dashboard/brand-brain" },
    { label: "Conectează Facebook / Instagram", done: metaConnected, to: "/dashboard/integrari" },
    { label: "Creează și publică prima postare din Studio", done: scheduled + posts.filter(p => p.status === "published").length > 0, to: "/dashboard/studio" },
  ];
  const doneCount = checklist.filter(c => c.done).length;

  const todos: { text: string; to: string; tone: "warn" | "info" }[] = [];
  if (failed.length) todos.push({ text: `${failed.length} postări nu au putut fi publicate`, to: "/dashboard/history", tone: "warn" });
  if (drafts) todos.push({ text: `${drafts} drafturi așteaptă să le revizuiești`, to: "/dashboard/history", tone: "info" });
  brain?.completeness.missing.slice(0, 3).forEach((m: any) => todos.push({ text: `Lipsește din Brand Brain: ${m.label}`, to: "/dashboard/brand-brain", tone: "info" }));

  return (
    <div className="space-y-6">
      <PageHeader title={`Bun venit${name ? `, ${name}` : ""}`} description={brain ? `Iată ce se întâmplă cu ${brain.brand.name}.` : undefined}
        actions={<Link to="/dashboard/studio" className="inline-flex items-center gap-2 rounded-xl gradient-bg px-4 py-2.5 text-sm font-semibold text-primary-foreground glow"><PenSquare className="h-4 w-4" />Deschide Studio</Link>} />

      {doneCount < checklist.length && (
        <Panel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">Activează SocialSpark</div>
              <div className="text-sm text-muted-foreground">{doneCount} din {checklist.length} pași finalizați</div>
            </div>
            <div className="w-40"><ProgressBar value={(doneCount / checklist.length) * 100} /></div>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {checklist.map(c => (
              <li key={c.label}>
                <Link to={c.to} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary">
                  {c.done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <MetaHealthAlert />

      <div className="grid gap-4 md:grid-cols-3">
        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ce se întâmplă</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span>Postări programate</span><b>{scheduled}</b></div>
            <div className="flex justify-between"><span>Drafturi</span><b>{drafts}</b></div>
            <div className="flex justify-between"><span>Facebook / Instagram</span>
              <b className={metaConnected ? "text-success" : "text-muted-foreground"}>{metaConnected ? "Conectat" : "Neconectat"}</b></div>
            <div className="flex justify-between"><span>Inbox AI</span><Link to="/dashboard/inbox" className="font-bold text-primary">Deschide</Link></div>
          </div>
        </Panel>
        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ce trebuie să faci</div>
          {todos.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Totul e în regulă. Nimic urgent.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {todos.slice(0, 5).map(t => (
                <li key={t.text}><Link to={t.to} className="flex items-start gap-2 text-sm hover:text-primary">
                  {t.tone === "warn" ? <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" /> : <ArrowRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />}{t.text}
                </Link></li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ce rezultat ai obținut</div>
          <div className="mt-3 font-display text-3xl font-bold">{published}</div>
          <div className="text-sm text-muted-foreground">postări publicate luna aceasta</div>
          <div className="mt-2 text-xs text-muted-foreground">Timp estimat economisit: ~{Math.round(published * 0.5 * 10) / 10} ore (estimare: 30 min/postare)</div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />Următoarele postări</div>
            <Link to="/dashboard/calendar" className="text-sm text-primary">Calendar</Link>
          </div>
          {nextPosts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nicio postare programată. <Link to="/dashboard/studio" className="text-primary">Pornește o conversație în Studio</Link>.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {nextPosts.map(p => (
                <li key={p.id} className="py-2.5 flex justify-between gap-3 text-sm">
                  <span className="truncate">{p.title ?? "(fără titlu)"}</span>
                  <span className="text-muted-foreground shrink-0">{new Date(p.scheduled_date!).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <div className="font-semibold flex items-center gap-2"><Brain className="h-4 w-4 text-primary" />Brand Brain</div>
          <div className="mt-3 flex items-baseline gap-2"><span className="font-display text-3xl font-bold">{score}%</span><span className="text-sm text-muted-foreground">complet</span></div>
          <div className="mt-2"><ProgressBar value={score} /></div>
          <p className="mt-3 text-sm text-muted-foreground">Cu cât AI-ul știe mai multe despre afacere, cu atât conținutul e mai bun.</p>
          <Link to="/dashboard/brand-brain" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">Completează <ArrowRight className="h-4 w-4" /></Link>
          {!metaConnected && (
            <Link to="/dashboard/integrari" className="mt-4 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm"><Plug className="h-4 w-4" />Conectează Facebook / Instagram</Link>
          )}
        </Panel>
      </div>
    </div>
  );
}
