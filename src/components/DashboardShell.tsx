import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, LayoutDashboard, Wand2, Plug, Calendar, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/generate", label: "Generează postare", icon: Wand2 },
  { to: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { to: "/dashboard/integrari", label: "Integrări", icon: Plug },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="lg:w-64 glass-strong border-b lg:border-b-0 lg:border-r border-border/50 lg:min-h-screen">
        <div className="p-5">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg gradient-bg glow">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            Social <span className="gradient-text">Spark</span>
          </Link>
        </div>
        <nav className="px-3 flex lg:flex-col gap-1 overflow-x-auto pb-3 lg:pb-0">
          {nav.map(n => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: "exact" in n ? n.exact : false }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground whitespace-nowrap"
              activeProps={{ className: "bg-secondary text-foreground" }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:block mt-auto p-3 absolute bottom-0 w-64">
          <button onClick={signOut}
            className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            <LogOut className="h-4 w-4" /> Ieși din cont
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
