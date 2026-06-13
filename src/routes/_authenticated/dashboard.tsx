import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wand2, Plug, Sparkles, CheckCircle, Clock, FileText, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Social Spark" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  return (
    <DashboardShell>
      <OnboardingDialog />
      {pathname !== "/dashboard" ? <Outlet /> : <DashboardHome />}
    </DashboardShell>
  );
}

type Post = {
  id: string; title: string | null; platform: string; content_type: string;
  status: string; created_at: string; scheduled_date: string | null;
};

type Profile = {
  full_name: string | null; company_name: string | null;
  subscription_plan: string; subscription_status: string; posts_remaining: number;
};

function DashboardHome() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: prof }, { data: ps }] = await Promise.all([
        supabase.from("users_profiles").select("full_name,company_name,subscription_plan,subscription_status,posts_remaining").eq("user_id", user.id).maybeSingle(),
        supabase.from("generated_posts").select("id,title,platform,content_type,status,created_at,scheduled_date").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setProfile(prof as Profile | null);
      setPosts((ps ?? []) as Post[]);
    })();
  }, []);

  const stats = [
    { label: "Plan curent", value: (profile?.subscription_plan ?? "free").toUpperCase(), icon: Sparkles },
    { label: "Postări rămase", value: profile?.posts_remaining ?? 0, icon: FileText },
    { label: "Postări programate", value: posts.filter(p => p.status === "scheduled").length, icon: Clock },
    { label: "Publicate", value: posts.filter(p => p.status === "published").length, icon: CheckCircle },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Bun venit{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}!</h1>
        <p className="text-muted-foreground mt-1">Aici e centrul de comandă al postărilor tale AI.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(s => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <s.icon className="h-5 w-5 text-primary mb-3" />
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="font-display text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/dashboard/generate" className="glass-strong rounded-2xl p-6 card-hover flex items-center justify-between">
          <div>
            <Wand2 className="h-6 w-6 text-primary mb-3" />
            <div className="font-semibold">Generează postare nouă</div>
            <div className="text-sm text-muted-foreground mt-1">AI-ul scrie, tu aprobi.</div>
          </div>
          <Send className="h-5 w-5 text-muted-foreground" />
        </Link>
        <Link to="/dashboard/integrari" className="glass-strong rounded-2xl p-6 card-hover flex items-center justify-between">
          <div>
            <Plug className="h-6 w-6 text-primary mb-3" />
            <div className="font-semibold">Conectează Instagram/Facebook</div>
            <div className="text-sm text-muted-foreground mt-1">Pentru publicare automată.</div>
          </div>
          <Send className="h-5 w-5 text-muted-foreground" />
        </Link>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold mb-4">Postări recente</h2>
        {posts.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
            Încă n-ai generat nicio postare.
            <div className="mt-4">
              <Link to="/dashboard/generate" className="inline-flex rounded-xl gradient-bg glow px-5 py-2.5 text-sm font-semibold text-white">
                Generează prima postare
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs text-muted-foreground">
                <tr><th className="text-left p-4">Titlu</th><th className="text-left p-4">Platformă</th><th className="text-left p-4">Tip</th><th className="text-left p-4">Status</th></tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id} className="border-t border-border/40">
                    <td className="p-4">{p.title ?? "(fără titlu)"}</td>
                    <td className="p-4 capitalize">{p.platform}</td>
                    <td className="p-4 capitalize">{p.content_type}</td>
                    <td className="p-4"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    approved: "bg-accent/20 text-accent",
    scheduled: "bg-primary/20 text-primary",
    published: "bg-green-500/20 text-green-400",
  };
  const labels: Record<string, string> = {
    draft: "Draft", approved: "Aprobată", scheduled: "Programată", published: "Publicată",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs ${map[status] ?? map.draft}`}>{labels[status] ?? status}</span>;
}
