import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generatePostsBulk } from "@/lib/bulk.functions";
import { TEMPLATES } from "@/lib/templates";
import { toast } from "sonner";
import { Layers, Loader2, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/bulk")({
  head: () => ({ meta: [{ title: "Bulk generate — Social Spark" }] }),
  component: BulkPage,
});

function BulkPage() {
  const navigate = useNavigate();
  const bulk = useServerFn(generatePostsBulk);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    domain: "", businessType: "", tone: "prietenos", goal: "vanzare",
    platform: "instagram", contentType: "static", extraContext: "", count: 5,
  });

  function applyTemplate(id: string) {
    const t = TEMPLATES.find(x => x.id === id);
    if (!t) return;
    setForm(f => ({ ...f, domain: t.domain, businessType: t.businessType, tone: t.tone, goal: t.goal, extraContext: t.extraContext ?? "" }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.domain || !form.businessType) { toast.error("Completează domeniul și tipul afacerii."); return; }
    setLoading(true);
    try {
      const r = await bulk({ data: form as any });
      toast.success(`${r.count} postări generate! Le găsești în Calendar și Dashboard.`);
      navigate({ to: "/dashboard/calendar" });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("402")) toast.error("Creditele AI s-au epuizat.");
      else if (msg.includes("429")) toast.error("Prea multe cereri. Reîncearcă.");
      else toast.error(msg || "Eroare la generare.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Layers className="h-7 w-7 text-primary" /> Bulk generate
        </h1>
        <p className="text-muted-foreground mt-1">Generează 2–15 postări dintr-un singur click. Perfect pentru a-ți pregăti conținutul pe o săptămână întreagă.</p>
      </div>

      <div className="glass-strong rounded-2xl p-6">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Pornește de la un template</div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => applyTemplate(t.id)} type="button"
              className="rounded-full glass px-3 py-1.5 text-xs hover:bg-secondary transition">
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="glass-strong rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Domeniu" v={form.domain} on={v => setForm({...form, domain: v})} placeholder="ex: frumusețe" />
          <Input label="Tip afacere" v={form.businessType} on={v => setForm({...form, businessType: v})} placeholder="ex: salon" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Ton" v={form.tone} on={v => setForm({...form, tone: v})} options={[
            ["profesional","Profesional"],["prietenos","Prietenos"],["premium","Premium"],["amuzant","Amuzant"],["direct","Direct"]]} />
          <Select label="Obiectiv" v={form.goal} on={v => setForm({...form, goal: v})} options={[
            ["vanzare","Vânzare"],["awareness","Awareness"],["promovare","Promovare"],["educare","Educare"],["testimonial","Testimonial"]]} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Platformă" v={form.platform} on={v => setForm({...form, platform: v})} options={[
            ["instagram","Instagram"],["facebook","Facebook"],["both","Ambele"]]} />
          <Select label="Tip conținut" v={form.contentType} on={v => setForm({...form, contentType: v})} options={[
            ["static","Postare statică"],["carousel","Carousel"],["video","Idee video"],["reels","Reels script"]]} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Detalii suplimentare (opțional)</label>
          <textarea value={form.extraContext} onChange={e => setForm({...form, extraContext: e.target.value})} rows={2}
            className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span>Câte postări vrei?</span>
            <span className="text-primary font-bold">{form.count}</span>
          </label>
          <input type="range" min={2} max={15} value={form.count}
            onChange={e => setForm({...form, count: parseInt(e.target.value)})}
            className="mt-2 w-full accent-primary" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>2</span><span>15</span></div>
        </div>
        <button disabled={loading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl gradient-bg glow px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generez {form.count} postări...</> : <><Wand2 className="h-4 w-4" /> Generează {form.count} postări</>}
        </button>
        <p className="text-xs text-muted-foreground">Va consuma {form.count} postări din planul tău.</p>
      </form>
    </div>
  );
}

function Input({ label, v, on, placeholder }: { label: string; v: string; on: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input value={v} onChange={e => on(e.target.value)} placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
    </div>
  );
}
function Select({ label, v, on, options }: { label: string; v: string; on: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select value={v} onChange={e => on(e.target.value)}
        className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary">
        {options.map(([val, lbl]) => <option key={val} value={val} className="bg-card">{lbl}</option>)}
      </select>
    </div>
  );
}
