import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/social-spark-logo.png.asset.json";

const links = [
  { to: "/", label: "Acasă" },
  { to: "/despre", label: "Despre noi" },
  { to: "/preturi", label: "Prețuri" },
  { to: "/blog", label: "Blog" },
  { to: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <img src={logoAsset.url} alt="Social Spark" className="h-9 w-9 object-contain" />
            <span>Social <span className="gradient-text">Spark</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <Link key={l.to} to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                activeProps={{ className: "text-foreground font-medium" }} activeOptions={{ exact: l.to === "/" }}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {authed ? (
              <>
                <Link to="/dashboard" className="text-sm">Dashboard</Link>
                <button onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">Ieși</button>
              </>
            ) : (
              <>
                <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Login</Link>
                <Link to="/auth" className="rounded-md gradient-bg glow px-4 py-2 text-sm font-medium text-white">
                  Începe acum
                </Link>
              </>
            )}
          </div>

          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-4 flex flex-col gap-3 animate-fade-in">
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-sm">{l.label}</Link>
            ))}
            {authed ? (
              <Link to="/dashboard" onClick={() => setOpen(false)} className="rounded-md gradient-bg px-4 py-2 text-sm text-center text-white">Dashboard</Link>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)} className="rounded-md gradient-bg px-4 py-2 text-sm text-center text-white">Începe acum</Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
