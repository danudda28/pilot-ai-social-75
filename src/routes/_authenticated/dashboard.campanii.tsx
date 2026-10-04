import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { PageHeader, Panel, SkeletonBlock } from "@/components/ui-kit";
import { listCampaigns, saveCampaign, deleteCampaign, generateCampaignPosts } from "@/lib/campaigns.functions";

export const Route = createFileRoute("/_authenticated/dashboard/campanii")({
  head: () => ({ meta: [{ title: "Campanii — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: CampaignsPage,
});

const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const KINDS = [{ v: "promotie", l: "Promoție / reducere" }, { v: "lansare", l: "Lansare produs/serviciu" }, { v: "eveniment", l: "Eveniment" }, { v: "sezonier", l: "Sezonieră" }, { v: "notorietate", l: "Notorietate" }] as const;
const STATUS: Record<string, string> = { activa: "Activă", pauza: "Pe pauză", incheiata: "Încheiată" };
const empty = { name: "", kind: "promotie" as (typeof KINDS)[number]["v"], offer: "", goal: "", start_date: "", end_date: "" };

function CampaignsPage() {
  const listFn = useServerFn(listCampaigns);
  const saveFn = useServerFn(saveCampaign);
  const delFn = useServerFn(deleteCampaign);
  const genFn = useServerFn(generateCampaignPosts);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [items, setItems] = useState<any[] | null>(null);
  const [form, setForm] = useState<typeof empty | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try { const r: any = await listFn({ data: {} }); setBrandId(r.brandId); setItems(r.campaigns); }
    catch (e: any) { toast.error(e?.message); setItems([]); }
  }
  useEffect(() => { load(); }, []);

  async function submit() {
    if (!brandId || !form) return;
    if (form.name.trim().length < 2) { toast.error("Dă un nume campaniei."); return; }
    setBusy("save");
    try {
      await saveFn({ data: { brandId, name: form.name, kind: form.kind, offer: form.offer || null, goal: form.goal || null, start_date: form.start_date || null, end_date: form.end_date || null } });
      toast.success("Campanie creată."); setForm(null); await load();
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  }

  async function setStatus(c: any, status: "activa" | "pauza" | "incheiata") {
    try { await saveFn({ data: { id: c.id, brandId: c.brand_id, name: c.name, kind: c.kind, status } }); await load(); } catch (e: any) { toast.error(e?.message); }
  }

  async function generate(c: any) {
    setBusy(c.id);
    try {
      const r = await genFn({ data: { id: c.id, count: 4 } });
      toast.success(`${r.count} drafturi create pentru campanie.`);
      if (r.flagged) toast.warning(`${r.flagged} postări conțin cuvinte interzise. Verifică-le înainte de publicare.`);
      await load();
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  }

  async function remove(c: any) {
    if (!window.confirm(`Ștergi campania „${c.name}”? Postările rămân, doar nu mai sunt legate de ea.`)) return;
    try { await delFn({ data: { id: c.id } }); await load(); } catch (e: any) { toast.error(e?.message); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Campanii" description="Grupează postările pe o ofertă, un eveniment sau o perioadă și urmărește progresul."
        actions={!form && <button onClick={() => setForm({ ...empty })} className="inline-flex items-center gap-2 rounded-xl gradient-bg px-4 py-2.5 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Campanie nouă</button>} />

      {form && (
        <Panel>
          <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Campanie nouă</h2>
            <button onClick={() => setForm(null)} aria-label="Închide" className="text-muted-foreground"><X className="h-4 w-4" /></button></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Nume<input className={inputCls + " mt-1"} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ex: Black Friday 2026" /></label>
            <label className="block text-sm font-medium">Tip
              <select className={inputCls + " mt-1"} value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as any })}>{KINDS.map(k => <option key={k.v} value={k.v}>{k.l}</option>)}</select></label>
            <label className="block text-sm font-medium sm:col-span-2">Oferta (exact cum vrei să apară)<input className={inputCls + " mt-1"} value={form.offer} onChange={e => setForm({ ...form, offer: e.target.value })} placeholder="ex: -20% la toate serviciile de tuns" /></label>
            <label className="block text-sm font-medium sm:col-span-2">Obiectiv<input className={inputCls + " mt-1"} value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} placeholder="ex: 30 de programări noi" /></label>
            <label className="block text-sm font-medium">Start<input type="date" className={inputCls + " mt-1"} value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></label>
            <label className="block text-sm font-medium">Final<input type="date" className={inputCls + " mt-1"} value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></label>
          </div>
          <button onClick={submit} disabled={busy === "save"} className="mt-4 inline-flex items-center gap-2 rounded-xl gradient-bg px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />} Salvează campania</button>
        </Panel>
      )}

      {items === null ? <SkeletonBlock className="h-48" /> : items.length === 0 && !form ? (
        <Panel><p className="text-center text-sm text-muted-foreground py-6">Nu ai încă nicio campanie. Creează una pentru o ofertă sau un eveniment.</p></Panel>
      ) : items.map(c => (
        <Panel key={c.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><h2 className="font-display text-lg font-bold">{c.name}</h2>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{STATUS[c.status] ?? c.status}</span></div>
              <p className="text-sm text-muted-foreground">{KINDS.find(k => k.v === c.kind)?.l}{c.start_date && ` · ${new Date(c.start_date).toLocaleDateString("ro-RO")}`}{c.end_date && ` – ${new Date(c.end_date).toLocaleDateString("ro-RO")}`}</p>
              {c.offer && <p className="mt-1 text-sm"><b>Ofertă:</b> {c.offer}</p>}
              {c.goal && <p className="text-sm"><b>Obiectiv:</b> {c.goal}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => generate(c)} disabled={!!busy} className="inline-flex items-center gap-2 rounded-xl gradient-bg px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">
                {busy === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Generează 4 postări</button>
              <select value={c.status} onChange={e => setStatus(c, e.target.value as any)} className="rounded-xl border border-border bg-background px-2 text-xs" aria-label="Stare campanie">
                {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              <button onClick={() => remove(c)} aria-label="Șterge campania" className="rounded-xl border border-border p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
            {[["draft", "Drafturi"], ["scheduled", "Programate"], ["published", "Publicate"], ["failed", "Eșuate"]].map(([k, l]) => (
              <div key={k} className="rounded-xl bg-secondary/60 p-2"><div className="text-lg font-bold">{c.counts[k] ?? 0}</div><div className="text-xs text-muted-foreground">{l}</div></div>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
