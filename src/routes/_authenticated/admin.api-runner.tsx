import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkAmAdmin } from "@/lib/admin.functions";
import { runApiCalls } from "@/lib/api-runner.functions";
import { Play, Loader2, CheckCircle2, XCircle, ArrowLeft, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/api-runner")({
  head: () => ({ meta: [{ title: "Rulare apeluri API — Admin" }] }),
  beforeLoad: async () => {
    try {
      const res = await checkAmAdmin();
      if (!(res as any).isAdmin) throw redirect({ to: "/dashboard" });
    } catch (e: any) {
      if (e?.options?.to) throw e;
      throw redirect({ to: "/dashboard" });
    }
  },
  component: ApiRunner,
});

const PRESETS = [1, 5, 10, 20, 50];

function ApiRunner() {
  const runFn = useServerFn(runApiCalls);
  const [count, setCount] = useState(5);
  const [prompt, setPrompt] = useState("Spune 'OK' într-un singur cuvânt.");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [delay, setDelay] = useState(250);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const res = await runFn({ data: { count, prompt, model, delayMs: delay } });
      setSummary(res);
    } catch (e: any) {
      setError(e?.message || "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Înapoi la Admin
      </Link>

      <div className="flex items-center gap-3">
        <Zap className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Rulare apeluri API</h1>
          <p className="text-muted-foreground mt-1">Rulează manual N apeluri către Lovable AI Gateway cu retry automat.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 space-y-5">
        <div>
          <label className="text-sm font-medium mb-2 block">Număr de apeluri: <span className="text-primary font-bold">{count}</span></label>
          <input
            type="range" min={1} max={50} value={count}
            onChange={e => setCount(Number(e.target.value))}
            className="w-full accent-primary"
            disabled={loading}
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            {PRESETS.map(p => (
              <button key={p} onClick={() => setCount(p)} disabled={loading}
                className={`px-3 py-1 rounded-lg text-xs border ${count === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Prompt trimis la fiecare apel</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={2} disabled={loading}
            className="w-full rounded-lg border border-border bg-background/50 p-3 text-sm" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Model</label>
            <select value={model} onChange={e => setModel(e.target.value)} disabled={loading}
              className="w-full rounded-lg border border-border bg-background/50 p-2 text-sm">
              <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (rapid, ieftin)</option>
              <option value="google/gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</option>
              <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="openai/gpt-5-mini">GPT-5 Mini</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Pauză între apeluri (ms)</label>
            <input type="number" min={0} max={5000} value={delay} onChange={e => setDelay(Number(e.target.value))} disabled={loading}
              className="w-full rounded-lg border border-border bg-background/50 p-2 text-sm" />
          </div>
        </div>

        <button onClick={handleRun} disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Rulează {count} apeluri…</> : <><Play className="h-5 w-5" /> Pornește</>}
        </button>
      </div>

      {error && (
        <div className="glass rounded-2xl p-5 border border-destructive/40 text-destructive text-sm">
          <XCircle className="inline h-5 w-5 mr-2" />{error}
        </div>
      )}

      {summary && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Total" value={summary.total} />
            <Stat label="Reușite" value={summary.ok} tone="ok" />
            <Stat label="Eșuate" value={summary.failed} tone={summary.failed ? "err" : undefined} />
            <Stat label="Timp mediu" value={`${summary.avgMs}ms`} />
          </div>
          <div className="max-h-96 overflow-auto space-y-1 text-xs font-mono">
            {summary.results.map((r: any) => (
              <div key={r.i} className={`flex gap-2 items-start p-2 rounded ${r.ok ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                {r.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />}
                <span className="text-muted-foreground w-8">#{r.i}</span>
                <span className="text-muted-foreground w-16">{r.ms}ms</span>
                <span className="flex-1 break-all">{r.ok ? r.text : r.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: "ok" | "err" }) {
  const color = tone === "ok" ? "text-emerald-500" : tone === "err" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl bg-background/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
