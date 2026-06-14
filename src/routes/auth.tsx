import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/social-spark-logo.png.asset.json";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { translateAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Autentificare — Social Spark" }] }),
  component: Auth,
});

const schema = z.object({
  email: z.string().trim().email("Email invalid").max(255),
  password: z.string().min(6, "Parola trebuie să aibă cel puțin 6 caractere").max(72),
});

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
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
      toast.success("Ți-am trimis un email cu link de resetare.");
      setMode("login");
      return;
    }

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName },
        },
      });
      setLoading(false);
      if (error) { toast.error(translateAuthError(error.message)); return; }

      // Apply referral code from URL ?ref=CODE
      const refCode = new URLSearchParams(window.location.search).get("ref");
      if (refCode) {
        try {
          const { applyReferralCode } = await import("@/lib/posts.functions");
          // Wait a moment for session to land, then apply
          setTimeout(async () => {
            try {
              const res = await applyReferralCode({ data: { code: refCode } });
              toast.success(`Cont creat + ${(res as any).bonus} postări bonus din referral!`);
            } catch {}
          }, 800);
        } catch {}
      }

      toast.success("Cont creat! Te redirecționăm...");
      navigate({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { toast.error("Email sau parolă incorecte."); return; }
      navigate({ to: "/dashboard" });
    }
  }

  const title = mode === "login" ? "Bine ai revenit" : mode === "register" ? "Creează cont" : "Recuperare parolă";
  const subtitle = mode === "login" ? "Intră în dashboard-ul tău." : mode === "register" ? "Începe gratuit, fără card." : "Îți trimitem un email cu link de resetare.";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold justify-center mb-8">
          <img src={logoAsset.url} alt="Social Spark" className="h-10 w-10 object-contain" />
          Social <span className="gradient-text">Spark</span>
        </Link>

        <div className="glass-strong rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nume complet</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
            </div>
            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Parolă</label>
                  {mode === "login" && (
                    <button type="button" onClick={() => setMode("forgot")}
                      className="text-xs text-primary hover:underline">
                      Ai uitat parola?
                    </button>
                  )}
                </div>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
              </div>
            )}
            <button disabled={loading}
              className="w-full rounded-xl gradient-bg glow px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? "Se procesează..." : mode === "login" ? "Intră în cont" : mode === "register" ? "Creează cont" : "Trimite link de resetare"}
            </button>
          </form>

          {mode === "forgot" ? (
            <button onClick={() => setMode("login")}
              className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground">
              Înapoi la login
            </button>
          ) : (
            <button onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground">
              {mode === "login" ? "Nu ai cont? Înregistrează-te" : "Ai deja cont? Login"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
