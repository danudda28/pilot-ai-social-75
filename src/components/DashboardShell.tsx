import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, Wand2, Plug, Calendar, LogOut, Layers, History, Users, BarChart3, Gift, Settings, Building2, Video, FileSpreadsheet, Shield, Image as ImageIcon, ClipboardCheck, Sparkles } from "lucide-react";
import logoAsset from "@/assets/social-spark-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { BrandSwitcher } from "@/components/BrandSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { checkAmAdmin } from "@/lib/admin.functions";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/generate", label: "Generează", icon: Wand2 },
  { to: "/dashboard/bulk", label: "Bulk AI", icon: Layers },
  { to: "/dashboard/import", label: "Import CSV", icon: FileSpreadsheet },
  { to: "/dashboard/video", label: "AI Video", icon: Video },
  { to: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { to: "/dashboard/history", label: "Istoric", icon: History },
  { to: "/dashboard/approvals", label: "Aprobări", icon: ClipboardCheck },
  { to: "/dashboard/media", label: "Galerie", icon: ImageIcon },
  { to: "/dashboard/ai-tools", label: "Asistent AI", icon: Sparkles },
  { to: "/dashboard/analytics", label: "Analitice", icon: BarChart3 },
  { to: "/dashboard/integrari", label: "Integrări", icon: Plug },
  { to: "/dashboard/brands", label: "Brand-uri", icon: Building2 },
  { to: "/dashboard/team", label: "Echipă", icon: Users },
  { to: "/dashboard/referral", label: "Referral", icon: Gift },
  { to: "/dashboard/settings", label: "Setări", icon: Settings },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const amAdmin = useServerFn(checkAmAdmin);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    amAdmin().then(r => setIsAdmin(!!(r as any).isAdmin)).catch(() => {});
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="lg:w-64 glass-strong border-b lg:border-b-0 lg:border-r border-border/50 lg:min-h-screen flex flex-col">
        <div className="p-5 space-y-3 flex items-center justify-between lg:block">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <img src={logoAsset.url} alt="Social Spark" className="h-9 w-9 object-contain" />
            Social <span className="gradient-text">Spark</span>
          </Link>
          <div className="lg:hidden"><NotificationsBell /></div>
          <BrandSwitcher />
        </div>
        <nav className="px-3 flex lg:flex-col gap-1 overflow-x-auto pb-3 lg:pb-0">
          {nav.map(n => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n ? n.exact : false }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground whitespace-nowrap"
              activeProps={{ className: "bg-secondary text-foreground" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary hover:bg-secondary whitespace-nowrap"
              activeProps={{ className: "bg-secondary" }}>
              <Shield className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>
        <div className="hidden lg:flex mt-auto p-3 gap-2 items-center">
          <NotificationsBell />
          <ThemeToggle />
          <button onClick={signOut}
            className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            <LogOut className="h-4 w-4" /> Ieși
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
