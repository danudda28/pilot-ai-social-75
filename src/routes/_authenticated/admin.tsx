import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { DashboardShell } from "@/components/DashboardShell";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminOverview, adminContactMessages, adminRecentUsers, checkAmAdmin } from "@/lib/admin.functions";
import { Shield, Users as UsersIcon, MessageSquare, FileText, Building2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Social Spark" }] }),
  beforeLoad: async () => {
    try {
      const res = await checkAmAdmin();
      if (!(res as any).isAdmin) throw redirect({ to: "/dashboard" });
    } catch (e: any) {
      if (e?.options?.to) throw e;
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  return (
    <DashboardShell>
      {pathname !== "/admin" ? <Outlet /> : <AdminHome />}
    </DashboardShell>
  );
}

function AdminHome() {
  const overview = useServerFn(adminOverview);
  const contact = useServerFn(adminContactMessages);
  const users = useServerFn(adminRecentUsers);
  const [stats, setStats] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, c, u] = await Promise.all([overview(), contact(), users()]);
        setStats(o);
        setMessages((c as any).messages);
        setUsersList((u as any).users);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const cards = [
    { label: "Utilizatori", value: stats?.users ?? 0, icon: UsersIcon },
    { label: "Branduri", value: stats?.brands ?? 0, icon: Building2 },
    { label: "Postări totale", value: stats?.postsTotal ?? 0, icon: FileText },
    { label: "Mesaje contact", value: stats?.contactMessages ?? 0, icon: MessageSquare },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Panou administrare</h1>
          <p className="text-muted-foreground mt-1">Statistici și gestionare globală.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="glass rounded-2xl p-5">
            <c.icon className="h-5 w-5 text-primary mb-3" />
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="font-display text-2xl font-bold mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      {stats?.postsByStatus && (
        <div className="glass-strong rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold mb-4">Postări după status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats.postsByStatus).map(([k, v]: any) => (
              <div key={k} className="rounded-lg bg-secondary/40 p-3">
                <div className="text-xs text-muted-foreground capitalize">{k}</div>
                <div className="text-xl font-bold mt-0.5">{v as number}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-strong rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold mb-4">Utilizatori recenți</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {usersList.map(u => (
              <div key={u.user_id} className="flex items-center justify-between rounded-lg bg-secondary/30 p-3 text-sm">
                <div>
                  <div className="font-medium">{u.full_name || "Fără nume"}</div>
                  <div className="text-xs text-muted-foreground">{u.company_name || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase font-semibold text-primary">{u.subscription_plan}</div>
                  <div className="text-[10px] text-muted-foreground">{u.posts_remaining} postări</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold mb-4">Mesaje contact</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {messages.map(m => (
              <div key={m.id} className="rounded-lg bg-secondary/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString("ro-RO")}</span>
                </div>
                <div className="text-xs text-muted-foreground">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
                <div className="text-xs mt-1 line-clamp-2">{m.message}</div>
              </div>
            ))}
            {messages.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Niciun mesaj.</div>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <Link to="/dashboard" className="text-primary hover:underline">← Înapoi la Dashboard</Link>
        <div className="flex gap-4">
          <Link to="/admin/monitor" className="text-primary hover:underline">📊 Monitorizare</Link>
          <Link to="/admin/api-runner" className="text-primary hover:underline">⚡ Rulare apeluri API →</Link>
          <Link to="/admin/meta-runner" className="text-primary hover:underline">🎯 Teste Marketing API →</Link>
        </div>
      </div>

    </div>
  );
}
