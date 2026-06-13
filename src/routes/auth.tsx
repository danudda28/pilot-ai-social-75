import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/social-spark-logo.png.asset.json";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

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
  const [mode, setMode] = useState<"login" | "register">("login");
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
      if (error) { toast.error(error.message); return; }
      toast.success("Cont creat! Te redirecționăm...");
      navigate({ to: "/dashboard" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { toast.error("Email sau parolă incorecte."); return; }
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold justify-center mb-8">
          <span className="grid h-9 w-9 place-items-center rounded-lg gradient-bg glow">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          Social <span className="gradient-text">Spark</span>
        </Link>

        <div className="glass-strong rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold">
            {mode === "login" ? "Bine ai revenit" : "Creează cont"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Intră în dashboard-ul tău." : "Începe gratuit, fără card."}
          </p>

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
            <div>
              <label className="text-xs font-medium text-muted-foreground">Parolă</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
            </div>
            <button disabled={loading}
              className="w-full rounded-xl gradient-bg glow px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? "Se procesează..." : (mode === "login" ? "Intră în cont" : "Creează cont")}
            </button>
          </form>

          <button onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground">
            {mode === "login" ? "Nu ai cont? Înregistrează-te" : "Ai deja cont? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
