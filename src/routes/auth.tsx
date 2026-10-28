import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/social-spark-logo.png.asset.json";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { sendWelcomeEmail } from "@/lib/email.functions";
import { translateAuthError } from "@/lib/auth-errors";
import {
  isLocalDevAuthEnabled,
  LOCAL_DEV_EMAIL,
  LOCAL_DEV_PASSWORD,
  readLocalDevSession,
} from "@/lib/local-dev-auth";
import { MARKETING_IMAGES } from "@/lib/marketing-images";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Autentificare — Social Spark" }] }),
  component: Auth,
});

const schema = z.object({
  email: z.string().trim().email("Email invalid").max(255),
  password: z.string().min(6, "Parola trebuie să aibă cel puțin 6 caractere").max(72),
});

const registerSchema = schema.extend({
  fullName: z.string().trim().min(2, "Introdu numele complet (minim 2 caractere)").max(100),
});

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Cont demo local (plan Agenție) — doar pe localhost, fără cloud
      if (isLocalDevAuthEnabled()) {
        if (readLocalDevSession()) {
          navigate({ to: "/dashboard/studio" });
          return;
        }
        setEmail(LOCAL_DEV_EMAIL);
        setPassword(LOCAL_DEV_PASSWORD);
        setFullName("Client Maxim");
        setIntent("Cont local demo · plan Agenție (700 credite). Nu folosește Supabase cloud.");
        const { error } = await supabase.auth.signInWithPassword({
          email: LOCAL_DEV_EMAIL,
          password: LOCAL_DEV_PASSWORD,
        });
        if (!error) {
          toast.success("Conectat local ca Client Maxim (Agenție).");
          navigate({ to: "/dashboard/studio" });
        }
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        navigate({ to: "/dashboard/studio" });
        return;
      }
      try {
        const plan = sessionStorage.getItem("ss-plan");
        const brief = sessionStorage.getItem("ss-brief");
        if (plan) {
          const saved = JSON.parse(plan) as { name?: string; cycle?: string };
          setMode("register");
          setIntent(`${saved.name ?? "Planul"} rămâne notat, cu facturare ${saved.cycle === "month" ? "lunară" : "anuală"}.`);
        } else if (brief) {
          setMode("register");
          setIntent("Schița primului reel te așteaptă după ce intri în cont. Generarea lui nu consumă credite.");
        }
      } catch {
        /* storage gol sau blocat */
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (mode === "forgot") {
      const emailParsed = z.string().trim().email().safeParse(email);
      if (!emailParsed.success) { toast.error("Email invalid"); return; }
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) { toast.error(translateAuthError(error.message)); return; }
      toast.success("Ți-am trimis un email cu link de resetare. Verifică și folderul Spam.");
      setMode("login");
      return;
    }

    const parsed = mode === "register"
      ? registerSchema.safeParse({ email, password, fullName })
      : schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    if (mode === "register") {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName },
        },
      });
      if (error) { setLoading(false); toast.error(translateAuthError(error.message)); return; }

      // If email confirmation is required, there's no session yet — sign in directly
      if (!signUpData.session) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setLoading(false);
          toast.error("Cont creat. Verifică emailul pentru confirmare, apoi intră în cont.");
          setMode("login");
          return;
        }
      }
      setLoading(false);

      // Apply referral code from URL ?ref=CODE
      const refCode = new URLSearchParams(window.location.search).get("ref");
      if (refCode) {
        try {
          const { applyReferralCode } = await import("@/lib/posts.functions");
          setTimeout(async () => {
            try {
              const res = await applyReferralCode({ data: { code: refCode } });
              toast.success(`Cont creat + ${(res as any).bonus} postări bonus din referral!`);
            } catch {}
          }, 800);
        } catch {}
      }

      toast.success("Cont creat! Te redirecționăm...");
      // Email de bun venit prin Resend (nu blochează înregistrarea)
      void sendWelcomeEmail().catch(() => {});
      navigate({ to: "/dashboard/studio" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { toast.error(translateAuthError(error.message)); return; }
      navigate({ to: "/dashboard/studio" });
    }
  }

  const title = mode === "login" ? "Bine ai revenit" : mode === "register" ? "Creează cont" : "Recuperare parolă";
  const subtitle = mode === "login" ? "Intră în dashboard-ul tău." : mode === "register" ? "Începe gratuit, fără card." : "Îți trimitem un email cu link de resetare.";

  return (
    <div className="marketing relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="m-hero-glow" />
      <div className="relative z-10 w-full max-w-md lg:max-w-5xl">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 text-lg font-medium text-white lg:justify-start">
          <img src={logoAsset.url} alt="Social Spark" className="h-9 w-9 object-contain" />
          Social Spark
        </Link>

        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-8">
          <div className="m-panel p-8">
            <h1 className="text-3xl tracking-tight text-white">{title}</h1>
            <p className="mt-2 text-sm text-white/45">{intent || subtitle}</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === "register" && (
                <div>
                  <label className="text-xs font-medium text-white/40">Nume complet</label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} maxLength={100}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[var(--m-accent)]" />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-white/40">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[var(--m-accent)]" />
              </div>
              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-white/40">Parolă</label>
                    {mode === "login" && (
                      <button type="button" onClick={() => setMode("forgot")}
                        className="text-xs text-[var(--m-accent)] hover:underline">
                        Ai uitat parola?
                      </button>
                    )}
                  </div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[var(--m-accent)]" />
                </div>
              )}
              <button disabled={loading}
                className="m-pill m-pill-solid w-full text-sm disabled:opacity-50">
                {loading ? "Se procesează..." : mode === "login" ? "Intră în cont" : mode === "register" ? "Creează cont" : "Trimite link de resetare"}
              </button>
            </form>

            {mode === "forgot" ? (
              <button onClick={() => setMode("login")}
                className="mt-6 w-full text-sm text-white/40 hover:text-white">
                Înapoi la login
              </button>
            ) : (
              <button onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="mt-6 w-full text-sm text-white/40 hover:text-white">
                {mode === "login" ? "Nu ai cont? Înregistrează-te" : "Ai deja cont? Login"}
              </button>
            )}
          </div>

          <aside className="hidden lg:flex lg:flex-col lg:justify-center">
            <img
              src={MARKETING_IMAGES.authDomenii.src}
              alt={MARKETING_IMAGES.authDomenii.alt}
              width={MARKETING_IMAGES.authDomenii.width}
              height={MARKETING_IMAGES.authDomenii.height}
              loading="lazy"
              decoding="async"
              className="h-auto w-full rounded-2xl object-contain"
            />
            <p className="mt-3 text-center text-[12px] text-white/35">Exemplu demonstrativ</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
