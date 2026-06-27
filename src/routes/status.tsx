import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status — Social Spark" },
      { name: "description", content: "Status în timp real al serviciilor Social Spark: bază de date, generare AI, publicare Meta." },
    ],
  }),
  component: StatusPage,
});

type Check = { name: string; status: "ok" | "down" | "loading"; latencyMs?: number };

function StatusPage() {
  const [checks, setChecks] = useState<Check[]>([
    { name: "Bază de date", status: "loading" },
    { name: "Autentificare", status: "loading" },
    { name: "API public", status: "loading" },
  ]);

  useEffect(() => {
    (async () => {
      const results: Check[] = [];

      // DB check
      const t1 = performance.now();
      try {
        await supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true });
        results.push({ name: "Bază de date", status: "ok", latencyMs: Math.round(performance.now() - t1) });
      } catch { results.push({ name: "Bază de date", status: "down" }); }

      // Auth check
      const t2 = performance.now();
      try {
        await supabase.auth.getSession();
        results.push({ name: "Autentificare", status: "ok", latencyMs: Math.round(performance.now() - t2) });
      } catch { results.push({ name: "Autentificare", status: "down" }); }

      // API check
      const t3 = performance.now();
      try {
        const r = await fetch("/api/public/health", { method: "GET" });
        results.push({ name: "API public", status: r.ok ? "ok" : "down", latencyMs: Math.round(performance.now() - t3) });
      } catch { results.push({ name: "API public", status: "down" }); }

      setChecks(results);
    })();
  }, []);

  const allOk = checks.every(c => c.status === "ok");
  const anyLoading = checks.some(c => c.status === "loading");

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-20">
        <h1 className="font-display text-4xl font-bold mb-2">Status sistem</h1>
        <p className="text-muted-foreground mb-10">Verificare în timp real a serviciilor Social Spark.</p>

        <div className={`rounded-2xl p-6 mb-8 ${anyLoading ? "glass" : allOk ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
          <div className="flex items-center gap-3">
            {anyLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> :
              allOk ? <CheckCircle2 className="h-6 w-6 text-green-500" /> :
              <AlertCircle className="h-6 w-6 text-red-500" />}
            <div>
              <div className="font-display text-xl font-bold">
                {anyLoading ? "Se verifică..." : allOk ? "Toate sistemele funcționează" : "Probleme detectate"}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Ultima verificare: {new Date().toLocaleString("ro-RO")}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl divide-y divide-border/40">
          {checks.map(c => (
            <div key={c.name} className="flex items-center justify-between p-5">
              <div className="font-medium">{c.name}</div>
              <div className="flex items-center gap-3">
                {c.latencyMs !== undefined && (
                  <span className="text-xs text-muted-foreground">{c.latencyMs}ms</span>
                )}
                {c.status === "loading" ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
                  c.status === "ok" ? <span className="text-sm font-semibold text-green-500 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Operațional</span> :
                  <span className="text-sm font-semibold text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Indisponibil</span>}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          Probleme? Scrie-ne la <a href="mailto:bogdansergiu.arghir@gmail.com" className="text-primary underline">bogdansergiu.arghir@gmail.com</a>
        </p>
      </div>
    </PublicLayout>
  );
}
