import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generatePost } from "@/lib/ai.functions";
import { toast } from "sonner";
import { Wand2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/generate")({
  head: () => ({ meta: [{ title: "Generează postare — AdPilot Social" }] }),
  component: Generate,
});

const tones = [
  { v: "profesional", l: "Profesional" },
  { v: "prietenos", l: "Prietenos" },
  { v: "premium", l: "Premium" },
  { v: "amuzant", l: "Amuzant" },
  { v: "direct", l: "Direct" },
];
const goals = [
  { v: "vanzare", l: "Vânzare" },
  { v: "awareness", l: "Awareness" },
  { v: "promovare", l: "Promovare ofertă" },
  { v: "educare", l: "Educare" },
  { v: "testimonial", l: "Testimonial" },
];
const platforms = [
  { v: "instagram", l: "Instagram" },
  { v: "facebook", l: "Facebook" },
  { v: "both", l: "Ambele" },
];
const contentTypes = [
  { v: "static", l: "Postare statică" },
  { v: "carousel", l: "Carousel" },
  { v: "video", l: "Idee video" },
  { v: "reels", l: "Reels script" },
];

function Generate() {
  const navigate = useNavigate();
  const generate = useServerFn(generatePost);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    domain: "", businessType: "", tone: "profesional", goal: "vanzare",
    platform: "instagram", contentType: "static", extraContext: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.domain || !form.businessType) { toast.error("Completează domeniul și tipul afacerii."); return; }
    setLoading(true); setResult(null);
    try {
      const r = await generate({ data: form as any });
      setResult(r);
      toast.success("Postare generată!");
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("402")) toast.error("Creditele AI s-au epuizat. Reîncarcă în Settings.");
      else if (msg.includes("429")) toast.error("Prea multe cereri. Reîncearcă în câteva secunde.");
      else toast.error(msg || "Eroare la generare.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Generează postare cu AI</h1>
        <p className="text-muted-foreground mt-1">Spune-i AI-ului ce vrei și primești în câteva secunde.</p>
      </div>

      <form onSubmit={submit} className="glass-strong rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Domeniu de activitate" placeholder="ex: frumusețe, food, auto, fitness"
            v={form.domain} on={v => setForm({...form, domain: v})} />
          <Input label="Tip afacere" placeholder="ex: salon de înfrumusețare, restaurant pizza"
            v={form.businessType} on={v => setForm({...form, businessType: v})} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Ton" v={form.tone} on={v => setForm({...form, tone: v})} options={tones} />
          <Select label="Obiectiv" v={form.goal} on={v => setForm({...form, goal: v})} options={goals} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Platformă" v={form.platform} on={v => setForm({...form, platform: v})} options={platforms} />
          <Select label="Tip conținut" v={form.contentType} on={v => setForm({...form, contentType: v})} options={contentTypes} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Detalii suplimentare (opțional)</label>
          <textarea value={form.extraContext} onChange={e => setForm({...form, extraContext: e.target.value})} rows={3}
            placeholder="ex: ofertă reducere 20% până vineri, produs nou X..."
            className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
        </div>
        <button disabled={loading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl gradient-bg glow px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generează...</> : <><Wand2 className="h-4 w-4" /> Generează cu AI</>}
        </button>
      </form>

      {result && (
        <div className="glass-strong rounded-2xl p-6 sm:p-8 space-y-5 animate-fade-in">
          <h2 className="font-display text-2xl font-bold gradient-text">{result.post.title}</h2>
          <Section label="Copy complet"><p className="whitespace-pre-wrap text-sm">{result.post.copy}</p></Section>
          <Section label="Variantă scurtă"><p className="text-sm">{result.post.short_copy}</p></Section>
          <Section label="Hashtaguri"><p className="text-sm text-accent">{result.post.hashtags}</p></Section>
          <Section label="Idee vizuală"><p className="text-sm">{result.post.visual_idea}</p></Section>
          <Section label="Call to action"><p className="text-sm font-medium">{result.post.call_to_action}</p></Section>
          {result.ai?.image_suggestion && <Section label="Sugestie imagine/video"><p className="text-sm">{result.ai.image_suggestion}</p></Section>}
          {result.ai?.recommended_date && <Section label="Dată recomandată"><p className="text-sm">{result.ai.recommended_date}</p></Section>}
          <div className="pt-4 flex gap-3">
            <button onClick={() => navigate({ to: "/dashboard" })} className="rounded-xl glass-strong px-5 py-2.5 text-sm font-semibold">
              Vezi în dashboard
            </button>
          </div>
        </div>
      )}
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
function Select({ label, v, on, options }: { label: string; v: string; on: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select value={v} onChange={e => on(e.target.value)}
        className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary">
        {options.map(o => <option key={o.v} value={o.v} className="bg-card">{o.l}</option>)}
      </select>
    </div>
  );
}
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      <div className="glass rounded-xl p-4">{children}</div>
    </div>
  );
}
