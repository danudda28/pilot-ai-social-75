import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoAsset from "@/assets/social-spark-logo.png.asset.json";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Resetare parolă — Social Spark" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase places a recovery token in the URL hash; the client picks it up automatically.
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setReady(true);
    } else {
      supabase.auth.getSession().then(({ data }) => {
        setReady(!!data.session);
      });
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { toast.error("Parola trebuie să aibă cel puțin 6 caractere."); return; }
    if (password !== confirm) { toast.error("Parolele nu coincid."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Parolă schimbată! Te redirecționăm...");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold justify-center mb-8">
          <img src={logoAsset.url} alt="Social Spark" className="h-10 w-10 object-contain" />
          Social <span className="gradient-text">Spark</span>
        </Link>
        <div className="glass-strong rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold">Setează o parolă nouă</h1>
          {!ready ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Link invalid sau expirat. Solicită din nou un email de resetare din pagina de login.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Parolă nouă</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Confirmă parola</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                  className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
              </div>
              <button disabled={loading}
                className="w-full rounded-xl gradient-bg glow px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
                {loading ? "Se salvează..." : "Salvează parola nouă"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
