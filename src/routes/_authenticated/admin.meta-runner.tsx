import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkAmAdmin } from "@/lib/admin.functions";
import { listAdAccounts, runMarketingCalls } from "@/lib/meta-runner.functions";
import { ArrowLeft, Loader2, Play, CheckCircle2, XCircle, Target } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/meta-runner")({
  head: () => ({ meta: [{ title: "Teste Marketing API — Admin" }] }),
  beforeLoad: async () => {
    try {
      const res = await checkAmAdmin();
      if (!(res as any).isAdmin) throw redirect({ to: "/dashboard" });
    } catch (e: any) {
      if (e?.options?.to) throw e;
      throw redirect({ to: "/dashboard" });
    }
  },
  component: MetaRunner,
});

const EPS = [
  { id: "account", label: "Detalii cont" },
  { id: "campaigns", label: "Campanii" },
  { id: "adsets", label: "Seturi de reclame" },
  { id: "ads", label: "Reclame" },
  { id: "insights", label: "Statistici" },
] as const;

type Run = { total: number; success: number };

function MetaRunner() {
  const listFn = useServerFn(listAdAccounts);
  const runFn = useServerFn(runMarketingCalls);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [accErr, setAccErr] = useState<string | null>(null);
  const [act, setAct] = useState("");
  const [eps, setEps] = useState<string[]>(["account", "campaigns"]);
  const [count, setCount] = useState(50);
  const [delay, setDelay] = useState(300);
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Run[]>([]);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem("meta-runner-history") || "[]")); } catch {}
    listFn().then((r) => {
      setAccounts(r.accounts);
      setAccErr(r.error);
      if (r.accounts[0]) setAct(r.accounts[0].id);
    }).catch((e) => setAccErr(e.message));
  }, []);

  const totals = history.reduce((a, r) => ({ total: a.total + r.total, success: a.success + r.success }), { total: 0, success: 0 });
  const rate = totals.total ? Math.round((totals.success / totals.total) * 100) : 0;

  async function run() {
    setLoading(true); setError(null);
    try {
      const r = await runFn({ data: { adAccountId: act, endpoints: eps as any, count, delayMs: delay } });
      setLast(r);
      const h = [...history, { total: r.total, success: r.success }];
      setHistory(h);
      localStorage.setItem("meta-runner-history", JSON.stringify(h));
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Înapoi la Admin
      </Link>
      <div className="flex items-center gap-3">
        <Target className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Teste Marketing API</h1>
          <p className="text-muted-foreground mt-1">Rulează apeluri reale de citire către contul tău de reclame Meta, pentru Marketing API Access Tier (500 apeluri, minim 85% reușite).</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 grid grid-cols-3 gap-4 text-center">
        <div><div className="text-2xl font-bold">{totals.total} / 500</div><div className="text-xs text-muted-foreground">apeluri rulate de aici</div></div>
        <div><div className={`text-2xl font-bold ${rate >= 85 ? "text-primary" : "text-destructive"}`}>{rate}%</div><div className="text-xs text-muted-foreground">rată de succes</div></div>
        <div><button className="text-xs underline text-muted-foreground" onClick={() => { setHistory([]); localStorage.removeItem("meta-runner-history"); }}>Resetează contorul</button></div>
      </div>

      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <div>
          <label className="text-sm font-medium">Cont de reclame</label>
          {accErr ? (
            <p className="text-sm text-destructive mt-1">Nu pot citi conturile de reclame: {accErr}. Reconectează Facebook din Integrări după ce adaugi permisiunea <b>ads_read</b> în aplicația Meta.</p>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-1">Se încarcă… (dacă rămâne gol, creează un cont de reclame în Meta Business)</p>
          ) : (
            <select className="mt-1 w-full rounded-lg border bg-background p-2" value={act} onChange={(e) => setAct(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Ce să citească</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {EPS.map((e) => (
              <button key={e.id} type="button"
                onClick={() => setEps((s) => s.includes(e.id) ? s.filter((x) => x !== e.id) : [...s, e.id])}
                className={`px-3 py-1.5 rounded-full text-sm border ${eps.includes(e.id) ? "bg-primary text-primary-foreground" : "bg-background"}`}>{e.label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Număr apeluri (max 50)</label>
            <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Math.max(1, Math.min(50, +e.target.value || 1)))} className="mt-1 w-full rounded-lg border bg-background p-2" />
          </div>
          <div>
            <label className="text-sm font-medium">Pauză între apeluri (ms)</label>
            <input type="number" min={0} max={5000} value={delay} onChange={(e) => setDelay(+e.target.value || 0)} className="mt-1 w-full rounded-lg border bg-background p-2" />
          </div>
        </div>
        <button disabled={loading || !act || eps.length === 0} onClick={run}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-primary-foreground font-medium disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {loading ? "Rulează…" : `Rulează ${count} apeluri`}
        </button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {last && (
        <div className="rounded-2xl border bg-card p-5 space-y-3">
          <p className="font-medium">Ultima rulare: {last.success}/{last.total} reușite ({last.rate}%)</p>
          <div className="max-h-96 overflow-auto text-sm divide-y">
            {last.results.map((r: any) => (
              <div key={r.i} className="flex items-center gap-2 py-1.5">
                {r.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                <span className="w-8 text-muted-foreground">#{r.i}</span>
                <span className="w-24">{r.endpoint}</span>
                <span className="w-16 text-muted-foreground">{r.ms}ms</span>
                {r.error && <span className="text-destructive truncate">{r.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
