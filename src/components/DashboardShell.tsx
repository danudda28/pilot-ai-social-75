import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Plug, Settings, LogOut, Shield, Sparkles, MoreHorizontal, X } from "lucide-react";
import logoAsset from "@/assets/social-spark-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { BrandSwitcher } from "@/components/BrandSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { checkAmAdmin } from "@/lib/admin.functions";

type NavItem = { to: string; label: string; icon: typeof Settings; exact?: boolean; soon?: boolean; alsoActiveOn?: string[] };

const mainNav: NavItem[] = [
  { to: "/dashboard/studio", label: "Studio", icon: Sparkles },
  { to: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { to: "/dashboard/integrari", label: "Integrări", icon: Plug },
  { to: "/dashboard/settings", label: "Setări", icon: Settings, alsoActiveOn: ["/dashboard/brand-brain", "/dashboard/brands"] },
];

const bottomNav: NavItem[] = mainNav;

function useAlsoActive(item: NavItem) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return !!item.alsoActiveOn?.some((p) => pathname.startsWith(p));
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const alsoActive = useAlsoActive(item);
  return (
    <Link to={item.to} onClick={onClick} activeOptions={{ exact: !!item.exact }}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ${alsoActive ? "bg-secondary !text-foreground font-medium" : ""}`}
      activeProps={{ className: "bg-secondary !text-foreground font-medium" }}>
      <item.icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.soon && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">În curând</span>}
    </Link>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const amAdmin = useServerFn(checkAmAdmin);
  const [isAdmin, setIsAdmin] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    amAdmin().then(r => setIsAdmin(!!(r as any).isAdmin)).catch(() => {});
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const navBody = (onClick?: () => void) => (
    <>
      <div className="space-y-0.5">{mainNav.map(n => <NavLink key={n.to} item={n} onClick={onClick} />)}</div>
      {isAdmin && (
        <div className="mt-3"><NavLink item={{ to: "/admin", label: "Admin", icon: Shield }} onClick={onClick} /></div>
      )}
    </>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar h-screen sticky top-0">
        <div className="p-4 space-y-3">
          <Link to="/" className="flex items-center gap-2 font-display text-base font-bold">
            <img src={logoAsset.url} alt="Social Spark" className="h-8 w-8 object-contain" />
            Social Spark
          </Link>
          <BrandSwitcher />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-3">{navBody()}</nav>
        <div className="border-t border-border p-3 flex gap-2 items-center">
          <NotificationsBell />
          <ThemeToggle />
          <button onClick={signOut}
            className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
            <LogOut className="h-4 w-4" /> Ieși
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="px-3 py-2.5 flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2 font-display font-bold shrink-0">
            <img src={logoAsset.url} alt="Social Spark" className="h-7 w-7 object-contain" />
          </Link>
          <div className="flex-1 min-w-0"><BrandSwitcher /></div>
          <NotificationsBell />
        </div>
      </header>

      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {bottomNav.map(n => <BottomLink key={n.to} item={n} />)}
        <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground">
          <MoreHorizontal className="h-5 w-5" />Mai mult
        </button>
      </nav>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="font-display font-semibold">Meniu</span>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button onClick={() => setMoreOpen(false)} aria-label="Închide" className="rounded-lg p-2 hover:bg-secondary"><X className="h-4 w-4" /></button>
              </div>
            </div>
            {navBody(() => setMoreOpen(false))}
            <button onClick={signOut} className="mt-4 w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
              <LogOut className="h-4 w-4" /> Ieși din cont
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BottomLink({ item }: { item: NavItem }) {
  const alsoActive = useAlsoActive(item);
  return (
    <Link to={item.to} activeOptions={{ exact: !!item.exact }}
      className={`flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground ${alsoActive ? "!text-primary font-medium" : ""}`}
      activeProps={{ className: "!text-primary font-medium" }}>
      <item.icon className="h-5 w-5" />{item.label}
    </Link>
  );
}
