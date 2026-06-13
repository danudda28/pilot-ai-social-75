import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Wand2, Plug, Calendar, LogOut, Layers, History, Users, BarChart3, Gift, Settings, Building2 } from "lucide-react";
import logoAsset from "@/assets/social-spark-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { BrandSwitcher } from "@/components/BrandSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/generate", label: "Generează", icon: Wand2 },
  { to: "/dashboard/bulk", label: "Bulk", icon: Layers },
  { to: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { to: "/dashboard/history", label: "Istoric", icon: History },
  { to: "/dashboard/analytics", label: "Analitice", icon: BarChart3 },
  { to: "/dashboard/integrari", label: "Integrări", icon: Plug },
  { to: "/dashboard/brands", label: "Brand-uri", icon: Building2 },
  { to: "/dashboard/team", label: "Echipă", icon: Users },
  { to: "/dashboard/referral", label: "Referral", icon: Gift },
  { to: "/dashboard/settings", label: "Setări", icon: Settings },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="lg:w-64 glass-strong border-b lg:border-b-0 lg:border-r border-border/50 lg:min-h-screen flex flex-col">
        <div className="p-5 space-y-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <img src={logoAsset.url} alt="Social Spark" className="h-9 w-9 object-contain" />
            Social <span className="gradient-text">Spark</span>
          </Link>
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
        </nav>
        <div className="hidden lg:flex mt-auto p-3 gap-2 items-center">
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
