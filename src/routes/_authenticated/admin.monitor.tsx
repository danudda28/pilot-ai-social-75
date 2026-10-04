import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminMonitoring, adminRetryFailedJobs } from "@/lib/admin.functions";
import { Activity, AlertTriangle, Coins, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/monitor")({
  head: () => ({ meta: [{ title: "Monitorizare — Admin Social Spark" }] }),
  component: MonitorPage,
});

function MonitorPage() {
  const load = useServerFn(adminMonitoring);
  const retry = useServerFn(adminRetryFailedJobs);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setData(await load()); } finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);

  async function handleRetry() {
    setRetrying(true);
    try {
      const r = await retry();
      toast.success(`${r.retried} joburi repuse în coadă.`);
      await refresh();
    } catch (e: any) { toast.error(e?.message ?? "Eroare"); } finally { setRetrying(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const jobs = data?.jobsByStatus ?? {};
  const usage = data?.usageByFeature ?? {};

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-primary" />
          <div>
            <h1 className="font-display text-3xl font-bold">Monitorizare</h1>
            <p className="text-muted-foreground mt-1">Coadă de publicare, erori, costuri AI.</p>
          </div>
        </div>
        <button onClick={refresh} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
          <RefreshCw className="h-4 w-4" /> Reîmprospătează
        </button>
      </div>

      <div className="glass-strong rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-display text-lg font-bold">Joburi de publicare (ultimele 7 zile): {data?.jobsTotal7d ?? 0}</h2>
          {(jobs.failed ?? 0) > 0 && (
            <button onClick={handleRetry} disabled={retrying}
              className="inline-flex items-center gap-2 gradient-bg rounded-lg px-4 py-2 text-sm font-semibold text-white">
              {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Reîncearcă {jobs.failed} eșuate
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {["pending", "processing", "published", "failed", "cancelled"].map(s => (
            <div key={s} className="rounded-lg bg-secondary/40 p-3">
              <div className="text-xs text-muted-foreground capitalize">{s}</div>
              <div className={`text-xl font-bold mt-0.5 ${s === "failed" && jobs[s] ? "text-red-500" : ""}`}>{jobs[s] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-6">
        <h2 className="font-display text-lg font-bold mb-1 flex items-center gap-2"><Coins className="h-4 w-4" /> Utilizare AI (ultimele 30 de zile)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {data?.aiCalls30d ?? 0} apeluri · cost estimat ≈ ${data?.aiCost30dUsd ?? 0} USD
        </p>
        {Object.keys(usage).length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">Nicio utilizare AI înregistrată încă.</div>
        ) : (
          <div className="space-y-2">
            {Object.entries(usage).map(([feature, u]: any) => (
              <div key={feature} className="flex items-center justify-between rounded-lg bg-secondary/30 p-3 text-sm">
                <span className="font-medium">{feature}</span>
                <span className="text-xs text-muted-foreground">
                  {u.calls} apeluri · {(u.tokensIn + u.tokensOut).toLocaleString("ro-RO")} tokeni · ≈${u.costUsd.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-strong rounded-2xl p-6">
        <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Erori recente</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {(data?.errors ?? []).map((e: any) => (
            <div key={e.id} className="rounded-lg bg-secondary/30 p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium text-red-500">{e.source}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{new Date(e.created_at).toLocaleString("ro-RO")}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{e.message}</div>
            </div>
          ))}
          {(data?.errors ?? []).length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Nicio eroare înregistrată. 🎉</div>}
        </div>
      </div>

      <Link to="/admin" className="text-primary text-xs hover:underline">← Înapoi la Admin</Link>
    </div>
  );
}
