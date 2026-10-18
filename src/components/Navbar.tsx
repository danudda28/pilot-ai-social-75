import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/social-spark-logo.png.asset.json";
import { PRODUCTS, SOLUTIONS } from "@/lib/marketing";

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
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[oklch(0.141_0.005_285_/0.75)] backdrop-blur-xl">
      <div className="m-container flex h-[68px] items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-[17px] font-medium tracking-tight text-white">
          <img src={logoAsset.url} alt="" className="h-7 w-7 object-contain" />
          Social Spark
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <MenuGroup label="Produse" items={PRODUCTS} to="/produse/$slug" />
          <MenuGroup label="Soluții" items={SOLUTIONS} to="/solutii/$slug" />
          <Link to="/preturi" className="rounded-lg px-3 py-2 text-[15px] text-white/65 transition hover:text-white">
            Prețuri
          </Link>
          <Link to="/faq" className="rounded-lg px-3 py-2 text-[15px] text-white/65 transition hover:text-white">
            FAQ
          </Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {authed ? (
            <>
              <Link to="/dashboard" className="text-[15px] text-white/65 hover:text-white">Cont</Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
                className="m-pill m-pill-ghost text-sm"
              >
                Ieși
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="text-[15px] text-white/65 hover:text-white">Autentificare</Link>
              <Link to="/auth" className="m-pill m-pill-solid text-[15px]">Încearcă acum</Link>
            </>
          )}
        </div>

        <button className="text-white lg:hidden" onClick={() => setOpen((v) => !v)} aria-label={open ? "Închide meniul" : "Deschide meniul"}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="space-y-5 border-t border-white/5 px-5 py-5 lg:hidden">
          <MobileGroup label="Produse" items={PRODUCTS} to="/produse/$slug" close={() => setOpen(false)} />
          <MobileGroup label="Soluții" items={SOLUTIONS} to="/solutii/$slug" close={() => setOpen(false)} />
          <div className="flex flex-col gap-3 pt-2">
            <Link to="/preturi" onClick={() => setOpen(false)} className="text-white/80">Prețuri</Link>
            <Link to="/faq" onClick={() => setOpen(false)} className="text-white/80">FAQ</Link>
            <Link to={authed ? "/dashboard" : "/auth"} onClick={() => setOpen(false)} className="m-pill m-pill-solid text-center text-sm">
              {authed ? "Cont" : "Încearcă acum"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuGroup({
  label,
  items,
  to,
}: {
  label: string;
  items: { slug: string; nav: string; hint: string }[];
  to: "/produse/$slug" | "/solutii/$slug";
}) {
  return (
    <div className="group relative">
      <button type="button" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[15px] text-white/65 transition group-hover:text-white">
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-60 transition group-hover:rotate-180" />
      </button>
      <div className="invisible absolute left-1/2 top-full z-30 w-[340px] -translate-x-1/2 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[oklch(0.16_0.008_285)] p-2 shadow-2xl shadow-black/50">
          {items.map((item) => (
            <Link
              key={item.slug}
              to={to}
              params={{ slug: item.slug }}
              className="block rounded-xl px-3.5 py-3 transition hover:bg-white/5"
            >
              <span className="block text-[15px] text-white">{item.nav}</span>
              <span className="mt-1 block text-[13px] leading-snug text-white/45">{item.hint}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileGroup({
  label,
  items,
  to,
  close,
}: {
  label: string;
  items: { slug: string; nav: string }[];
  to: "/produse/$slug" | "/solutii/$slug";
  close: () => void;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">{label}</p>
      <div className="mt-2 flex flex-col gap-2 text-[15px]">
        {items.map((item) => (
          <Link key={item.slug} to={to} params={{ slug: item.slug }} onClick={close} className="text-white/85">
            {item.nav}
          </Link>
        ))}
      </div>
    </div>
  );
}
