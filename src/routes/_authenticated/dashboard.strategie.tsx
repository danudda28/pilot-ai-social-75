import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2, Wand2, CheckCircle2 } from "lucide-react";
import { PageHeader, Panel, SkeletonBlock } from "@/components/ui-kit";
import { listStrategies, generateStrategy, updateStrategyPlan, deleteStrategy, strategyToDrafts, type StrategyPlan } from "@/lib/strategy.functions";

export const Route = createFileRoute("/_authenticated/dashboard/strategie")({
  head: () => ({ meta: [{ title: "Strategie 30 de zile — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: StrategyPage,
});

const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
type Strategy = { id: string; title: string; goal: string | null; start_date: string; end_date: string; posts_per_week: number; plan: StrategyPlan; status: string };

function StrategyPage() {
  const listFn = useServerFn(listStrategies);
  const genFn = useServerFn(generateStrategy);
  const saveFn = useServerFn(updateStrategyPlan);
  const delFn = useServerFn(deleteStrategy);
  const draftsFn = useServerFn(strategyToDrafts);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [items, setItems] = useState<Strategy[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ goal: "Mai multe mesaje de la clienți noi", postsPerWeek: 3, startDate: new Date().toISOString().slice(0, 10), notes: "" });

  async function load() {
    try { const r: any = await listFn({ data: {} }); setBrandId(r.brandId); setItems(r.strategies); }
    catch (e: any) { toast.error(e?.message); setItems([]); }
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!brandId) return;
    setBusy("gen");
    try { await genFn({ data: { brandId, ...form, notes: form.notes || undefined } }); toast.success("Strategia e gata. Verific-o mai jos."); await load(); }
    catch (e: any) { toast.error(e?.message ?? "Nu am putut crea strategia."); }
    finally { setBusy(null); }
  }

  async function editTopic(s: Strategy, wi: number, pi: number, topic: string) {
    const plan = structuredClone(s.plan);
    plan.weeks[wi].posts[pi].topic = topic;
    setItems(prev => prev?.map(x => x.id === s.id ? { ...x, plan } : x) ?? null);
    try { await saveFn({ data: { id: s.id, plan } }); } catch (e: any) { toast.error(e?.message); }
  }

  async function toDrafts(s: Strategy) {
    setBusy(s.id);
    try { const r = await draftsFn({ data: { id: s.id } }); toast.success(`${r.count} drafturi create. Le găsești în Calendar.`); await load(); }
    catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  }

  async function remove(s: Strategy) {
    if (!window.confirm("Ștergi strategia? Drafturile deja create rămân.")) return;
    try { await delFn({ data: { id: s.id } }); await load(); } catch (e: any) { toast.error(e?.message); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Strategie pe 30 de zile" description="AI-ul face un plan pe baza informațiilor confirmate din Brand Brain. Îl verifici, îl ajustezi, apoi îl transformi în drafturi." />

      <Panel>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">Ce vrei să obții în următoarele 30 de zile?
            <input className={inputCls + " mt-1"} value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} /></label>
          <label className="block text-sm font-medium">Postări pe săptămână
            <select className={inputCls + " mt-1"} value={form.postsPerWeek} onChange={e => setForm({ ...form, postsPerWeek: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}
            </select></label>
          <label className="block text-sm font-medium">Începe pe
            <input type="date" className={inputCls + " mt-1"} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></label>
          <label className="block text-sm font-medium sm:col-span-2">Ceva important în perioada asta? (opțional)
            <input className={inputCls + " mt-1"} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ex: deschidem a doua locație pe 15" /></label>
        </div>
        <button onClick={create} disabled={!!busy || !brandId} className="mt-4 inline-flex items-center gap-2 rounded-xl gradient-bg px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy === "gen" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy === "gen" ? "Creez strategia…" : "Creează strategia"}
        </button>
        <p className="mt-2 text-xs text-muted-foreground">Cu cât Brand Brain e mai complet, cu atât planul e mai bun. <Link to="/dashboard/brand-brain" className="text-primary">Completează Brand Brain</Link></p>
      </Panel>

      {items === null ? <SkeletonBlock className="h-64" /> : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Nu ai încă nicio strategie.</p>
      ) : items.map(s => (
        <Panel key={s.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">{s.title}</h2>
              <p className="text-sm text-muted-foreground">{new Date(s.start_date).toLocaleDateString("ro-RO")} – {new Date(s.end_date).toLocaleDateString("ro-RO")} · {s.posts_per_week} postări/săptămână · {s.goal}</p>
            </div>
            <div className="flex gap-2">
              {s.status === "converted" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success"><CheckCircle2 className="h-3.5 w-3.5" /> Drafturi create</span>
              ) : (
                <button onClick={() => toDrafts(s)} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl gradient-bg px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
                  {busy === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} {busy === s.id ? "Scriu postările…" : "Transformă în drafturi"}
                </button>
              )}
              <button onClick={() => remove(s)} aria-label="Șterge strategia" className="rounded-xl border border-border p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          {s.plan?.summary && <p className="mt-3 text-sm">{s.plan.summary}</p>}
          {s.plan?.pillars?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{s.plan.pillars.map(p => <span key={p} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{p}</span>)}</div>}
          <div className="mt-4 space-y-4">
            {s.plan?.weeks?.map((w, wi) => (
              <div key={wi}>
                <div className="text-sm font-semibold">Săptămâna {w.week}: <span className="font-normal text-muted-foreground">{w.theme}</span></div>
                <ul className="mt-2 space-y-1.5">
                  {w.posts.map((p, pi) => (
                    <li key={pi} className="flex items-center gap-2 text-sm">
                      <span className="w-14 shrink-0 text-xs text-muted-foreground">Ziua {p.day}</span>
                      <span className="w-20 shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-center text-xs">{p.format}</span>
                      <input disabled={s.status === "converted"} defaultValue={p.topic} onBlur={e => e.target.value !== p.topic && editTopic(s, wi, pi, e.target.value)}
                        className="flex-1 min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1 hover:border-border focus:border-input focus:outline-none disabled:opacity-80" />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
