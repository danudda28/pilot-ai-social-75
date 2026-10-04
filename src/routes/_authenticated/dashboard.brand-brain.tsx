import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getBrandBrain, updateBrandProfile, saveVoiceRules, saveBrainItem, deleteBrainItem } from "@/lib/brand-brain.functions";
import { PageHeader, Panel, ProgressBar, SaveIndicator, SkeletonBlock } from "@/components/ui-kit";
import { Plus, Trash2, Pencil, Loader2, AlertCircle, Brain } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/brand-brain")({
  head: () => ({ meta: [{ title: "Brand Brain — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: BrandBrainPage,
});

const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const TABS = [
  { id: "profil", label: "Profil" }, { id: "locatii", label: "Locații" }, { id: "produse", label: "Produse și servicii" },
  { id: "faq", label: "Întrebări frecvente" }, { id: "politici", label: "Politici" }, { id: "voce", label: "Voce" },
  { id: "surse", label: "Surse de informații" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Field = { key: string; label: string; type?: "text" | "textarea" | "number" | "select"; options?: { v: string; l: string }[]; required?: boolean };
type ListTable = "brand_locations" | "products_services" | "business_policies" | "brand_faqs" | "knowledge_sources";

const PROFILE_FIELDS: Field[] = [
  { key: "name", label: "Nume comercial" }, { key: "legal_name", label: "Denumire legală" },
  { key: "category", label: "Categorie" }, { key: "subcategory", label: "Subcategorie" },
  { key: "short_description", label: "Descriere scurtă", type: "textarea" }, { key: "long_description", label: "Descriere detaliată", type: "textarea" },
  { key: "target_audience", label: "Public țintă", type: "textarea" }, { key: "differentiators", label: "Ce vă diferențiază", type: "textarea" },
  { key: "brand_values", label: "Valori", type: "textarea" }, { key: "website_url", label: "Website" },
  { key: "phone", label: "Telefon" }, { key: "email", label: "Email" }, { key: "whatsapp", label: "WhatsApp" },
  { key: "booking_url", label: "Link programare / comandă" }, { key: "city", label: "Oraș" }, { key: "country", label: "Țară" },
];

const LIST_CONFIG: Record<Exclude<TabId, "profil" | "voce">, { table: ListTable; empty: string; fields: Field[]; title: (r: any) => string; sub?: (r: any) => string }> = {
  locatii: {
    table: "brand_locations", empty: "Adaugă locațiile fizice sau zona deservită. Dacă vinzi doar online, poți sări.",
    fields: [{ key: "name", label: "Nume locație", required: true }, { key: "address", label: "Adresă" }, { key: "city", label: "Oraș" }, { key: "phone", label: "Telefon" }, { key: "hours", label: "Program (ex: L-V 9-18, S 10-14)" }, { key: "service_area", label: "Zonă deservită" }, { key: "booking_url", label: "Link programare" }],
    title: r => r.name, sub: r => [r.address, r.city, r.opening_hours?.general].filter(Boolean).join(" · "),
  },
  produse: {
    table: "products_services", empty: "Adaugă serviciile sau produsele principale. Dacă nu vrei să afișezi prețul, alege „La cerere”.",
    fields: [{ key: "name", label: "Nume", required: true }, { key: "description", label: "Descriere", type: "textarea" },
      { key: "price_type", label: "Tip preț", type: "select", options: [{ v: "fixed", l: "Preț fix" }, { v: "from", l: "De la" }, { v: "range", l: "Interval" }, { v: "on_request", l: "La cerere" }, { v: "unknown", l: "Necunoscut" }] },
      { key: "price_from", label: "Preț (RON)", type: "number" }, { key: "price_to", label: "Preț maxim (RON)", type: "number" }, { key: "duration", label: "Durată" }],
    title: r => r.name, sub: r => priceLabel(r),
  },
  faq: {
    table: "brand_faqs", empty: "Adaugă întrebările pe care ți le pun clienții cel mai des, cu răspunsul corect.",
    fields: [{ key: "question", label: "Întrebare", required: true }, { key: "answer", label: "Răspuns", type: "textarea", required: true }],
    title: r => r.question, sub: r => r.answer,
  },
  politici: {
    table: "business_policies", empty: "Adaugă reguli precum livrare, anulare, retur, garanție, plată.",
    fields: [{ key: "kind", label: "Tip", type: "select", options: ["livrare", "anulare", "retur", "garanție", "plată", "altele"].map(v => ({ v, l: v })) }, { key: "title", label: "Titlu", required: true }, { key: "content", label: "Conținut", type: "textarea", required: true }],
    title: r => r.title, sub: r => r.content,
  },
  surse: {
    table: "knowledge_sources", empty: "Adaugă texte sau linkuri cu informații despre afacere. Doar sursele confirmate vor fi folosite de AI.",
    fields: [{ key: "title", label: "Titlu", required: true }, { key: "kind", label: "Tip", type: "select", options: [{ v: "manual", l: "Text" }, { v: "website", l: "Pagină web" }, { v: "document", l: "Document" }] }, { key: "url", label: "Link (opțional)" }, { key: "content", label: "Conținut", type: "textarea" },
      { key: "status", label: "Stare", type: "select", options: [{ v: "draft", l: "Draft — nu e folosit de AI" }, { v: "confirmed", l: "Confirmat — folosit de AI" }, { v: "archived", l: "Arhivat" }] }],
    title: r => r.title, sub: r => (r.status === "confirmed" ? "Confirmat" : r.status === "archived" ? "Arhivat" : "Draft") + (r.url ? ` · ${r.url}` : ""),
  },
};

function priceLabel(r: any) {
  const c = r.currency ?? "RON";
  switch (r.price_type) {
    case "fixed": return r.price_from != null ? `${r.price_from} ${c}` : "Preț fix";
    case "from": return `de la ${r.price_from ?? "?"} ${c}`;
    case "range": return `${r.price_from ?? "?"}–${r.price_to ?? "?"} ${c}`;
    case "on_request": return "Preț la cerere";
    default: return "Preț necunoscut — AI-ul nu va menționa un preț";
  }
}

function BrandBrainPage() {
  const brainFn = useServerFn(getBrandBrain);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<TabId>("profil");

  async function load() {
    try { setData(await brainFn({ data: {} })); } catch (e: any) { toast.error(e?.message ?? "Eroare la încărcare."); }
  }
  useEffect(() => { load(); }, []);

  if (!data) return <div className="space-y-4"><SkeletonBlock className="h-9 w-56" /><SkeletonBlock className="h-24" /><SkeletonBlock className="h-80" /></div>;
  const canEdit = ["owner", "admin", "marketer"].includes(data.role ?? "owner");

  return (
    <div>
      <PageHeader title="Brand Brain" description="Memoria afacerii tale. AI-ul folosește doar ce e aici pentru postări și, în curând, pentru răspunsuri." />
      <Panel className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:w-56">
            <div className="h-10 w-10 rounded-xl gradient-bg grid place-items-center"><Brain className="h-5 w-5 text-primary-foreground" /></div>
            <div><div className="font-display text-2xl font-bold">{data.completeness.score}%</div><div className="text-xs text-muted-foreground">complet</div></div>
          </div>
          <div className="flex-1"><ProgressBar value={data.completeness.score} />
            {data.completeness.missing.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">{data.completeness.missing.map((m: any) => (
                <span key={m.key} className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs"><AlertCircle className="h-3 w-3" />{m.label}</span>
              ))}</div>
            )}
          </div>
        </div>
        {!canEdit && <p className="mt-3 text-xs text-muted-foreground">Ai acces doar de vizualizare.</p>}
      </Panel>

      <div className="flex gap-1 overflow-x-auto mb-4 [scrollbar-width:none]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm ${tab === t.id ? "bg-secondary font-medium" : "text-muted-foreground hover:bg-secondary"}`}>{t.label}</button>
        ))}
      </div>

      {tab === "profil" && <ProfileTab brand={data.brand} canEdit={canEdit} onSaved={load} />}
      {tab === "voce" && <VoiceTab brandId={data.brand.id} voice={data.voice} canEdit={canEdit} onSaved={load} />}
      {tab !== "profil" && tab !== "voce" && (
        <ListTab key={tab} brandId={data.brand.id} rows={data.lists[LIST_CONFIG[tab].table]} cfg={LIST_CONFIG[tab]} canEdit={canEdit} onChange={load} />
      )}
    </div>
  );
}

function ProfileTab({ brand, canEdit, onSaved }: { brand: any; canEdit: boolean; onSaved: () => void }) {
  const updateFn = useServerFn(updateBrandProfile);
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(PROFILE_FIELDS.map(f => [f.key, brand[f.key] ?? ""])));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(key: string) {
    if ((brand[key] ?? "") === vals[key]) return;
    if (key === "name" && vals.name.trim().length < 2) { toast.error("Numele trebuie să aibă minim 2 caractere."); return; }
    setState("saving");
    try {
      await updateFn({ data: { brandId: brand.id, fields: { [key]: vals[key].trim() || (key === "name" ? brand.name : null) } as any } });
      brand[key] = vals[key];
      setState("saved"); onSaved();
    } catch (e: any) { setState("error"); toast.error(e?.message); }
  }

  return (
    <Panel>
      <div className="flex justify-end mb-2 h-4"><SaveIndicator state={state} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {PROFILE_FIELDS.map(f => (
          <label key={f.key} className={`block text-sm font-medium ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>{f.label}
            {f.type === "textarea"
              ? <textarea rows={3} disabled={!canEdit} className={inputCls + " mt-1"} value={vals[f.key]} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} onBlur={() => save(f.key)} />
              : <input disabled={!canEdit} className={inputCls + " mt-1"} value={vals[f.key]} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} onBlur={() => save(f.key)} />}
          </label>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Modificările se salvează automat când ieși din câmp.</p>
    </Panel>
  );
}

function VoiceTab({ brandId, voice, canEdit, onSaved }: { brandId: string; voice: any; canEdit: boolean; onSaved: () => void }) {
  const voiceFn = useServerFn(saveVoiceRules);
  const [v, setV] = useState({
    tone: voice?.tone ?? "prietenos", address_form: voice?.address_form ?? "tu", emoji_level: voice?.emoji_level ?? "putine", text_length: voice?.text_length ?? "mediu",
    preferred_phrases: (voice?.preferred_phrases ?? []).join(", "), banned_words: (voice?.banned_words ?? []).join(", "),
    example_posts: (voice?.example_posts ?? []).join("\n---\n"), example_replies: (voice?.example_replies ?? []).join("\n---\n"),
    colors: (voice?.colors ?? []).join(", "), fonts: (voice?.fonts ?? []).join(", "),
  });
  const [busy, setBusy] = useState(false);
  const csv = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);
  const blocks = (s: string) => s.split(/\n---\n/).map(x => x.trim()).filter(Boolean);

  async function save() {
    setBusy(true);
    try {
      await voiceFn({ data: { brandId, tone: v.tone, address_form: v.address_form as any, emoji_level: v.emoji_level as any, text_length: v.text_length as any,
        preferred_phrases: csv(v.preferred_phrases), banned_words: csv(v.banned_words), example_posts: blocks(v.example_posts).slice(0, 10),
        example_replies: blocks(v.example_replies).slice(0, 10), colors: csv(v.colors).slice(0, 10), fonts: csv(v.fonts).slice(0, 5) } });
      toast.success("Vocea brandului a fost salvată."); onSaved();
    } catch (e: any) { toast.error(e?.message); } finally { setBusy(false); }
  }
  const sel = (key: keyof typeof v, opts: [string, string][]) => (
    <select disabled={!canEdit} className={inputCls + " mt-1"} value={v[key]} onChange={e => setV({ ...v, [key]: e.target.value })}>
      {opts.map(([a, b]) => <option key={a} value={a}>{b}</option>)}
    </select>
  );
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Ton{sel("tone", ["prietenos", "profesionist", "premium", "energic", "educațional", "direct"].map(t => [t, t]))}</label>
        <label className="text-sm font-medium">Adresare{sel("address_form", [["tu", "Tu"], ["dumneavoastra", "Dumneavoastră"]])}</label>
        <label className="text-sm font-medium">Emoji{sel("emoji_level", [["fara", "Fără"], ["putine", "Puține"], ["moderate", "Moderate"]])}</label>
        <label className="text-sm font-medium">Lungime texte{sel("text_length", [["scurt", "Scurte"], ["mediu", "Medii"], ["lung", "Lungi"]])}</label>
        <label className="text-sm font-medium sm:col-span-2">Expresii preferate (virgulă)<input disabled={!canEdit} className={inputCls + " mt-1"} value={v.preferred_phrases} onChange={e => setV({ ...v, preferred_phrases: e.target.value })} /></label>
        <label className="text-sm font-medium sm:col-span-2">Cuvinte interzise (virgulă)<input disabled={!canEdit} className={inputCls + " mt-1"} value={v.banned_words} onChange={e => setV({ ...v, banned_words: e.target.value })} /></label>
        <label className="text-sm font-medium sm:col-span-2">Exemple de postări apreciate (separă cu o linie „---”)<textarea rows={4} disabled={!canEdit} className={inputCls + " mt-1"} value={v.example_posts} onChange={e => setV({ ...v, example_posts: e.target.value })} /></label>
        <label className="text-sm font-medium sm:col-span-2">Exemple de răspunsuri corecte către clienți (separă cu „---”)<textarea rows={4} disabled={!canEdit} className={inputCls + " mt-1"} value={v.example_replies} onChange={e => setV({ ...v, example_replies: e.target.value })} /></label>
        <label className="text-sm font-medium">Culori brand (ex: #6d28d9, #0ea5e9)<input disabled={!canEdit} className={inputCls + " mt-1"} value={v.colors} onChange={e => setV({ ...v, colors: e.target.value })} />
          <div className="mt-2 flex gap-1.5">{csv(v.colors).map(c => <span key={c} className="h-6 w-6 rounded-full border border-border" style={{ background: c }} />)}</div></label>
        <label className="text-sm font-medium">Fonturi<input disabled={!canEdit} className={inputCls + " mt-1"} value={v.fonts} onChange={e => setV({ ...v, fonts: e.target.value })} /></label>
      </div>
      {canEdit && <button onClick={save} disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-xl gradient-bg px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Salvează</button>}
    </Panel>
  );
}

function ListTab({ brandId, rows, cfg, canEdit, onChange }: { brandId: string; rows: any[]; cfg: (typeof LIST_CONFIG)[keyof typeof LIST_CONFIG]; canEdit: boolean; onChange: () => void }) {
  const saveFn = useServerFn(saveBrainItem);
  const delFn = useServerFn(deleteBrainItem);
  const [editing, setEditing] = useState<{ id?: string; vals: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(false);

  function open(row?: any) {
    const vals: Record<string, string> = {};
    cfg.fields.forEach(f => {
      if (f.key === "hours") vals.hours = row?.opening_hours?.general ?? "";
      else vals[f.key] = row?.[f.key] != null ? String(row[f.key]) : (f.options?.[0]?.v ?? "");
    });
    setEditing({ id: row?.id, vals });
  }

  async function save() {
    if (!editing) return;
    for (const f of cfg.fields) if (f.required && !editing.vals[f.key]?.trim()) { toast.error(`Completează: ${f.label}`); return; }
    const item: Record<string, unknown> = {};
    cfg.fields.forEach(f => {
      const raw = editing.vals[f.key]?.trim() ?? "";
      if (f.key === "hours") { item.opening_hours = raw ? { general: raw } : {}; return; }
      item[f.key] = f.type === "number" ? (raw ? Number(raw) : null) : (raw || (f.required ? raw : null));
    });
    setBusy(true);
    try { await saveFn({ data: { table: cfg.table, brandId, id: editing.id, item } }); setEditing(null); toast.success("Salvat."); onChange(); }
    catch (e: any) { toast.error(e?.message?.includes("Invalid") ? "Date invalide. Verifică câmpurile." : e?.message); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Sigur ștergi această informație?")) return;
    try { await delFn({ data: { table: cfg.table, id } }); toast.success("Șters."); onChange(); } catch (e: any) { toast.error(e?.message); }
  }

  return (
    <Panel>
      {canEdit && !editing && (
        <button onClick={() => open()} className="mb-4 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:bg-secondary"><Plus className="h-4 w-4" />Adaugă</button>
      )}
      {editing && (
        <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-4 grid gap-3 sm:grid-cols-2">
          {cfg.fields.map(f => (
            <label key={f.key} className={`text-sm font-medium ${f.type === "textarea" ? "sm:col-span-2" : ""}`}>{f.label}{f.required && " *"}
              {f.type === "textarea" ? <textarea rows={3} className={inputCls + " mt-1"} value={editing.vals[f.key]} onChange={e => setEditing({ ...editing, vals: { ...editing.vals, [f.key]: e.target.value } })} />
                : f.type === "select" ? <select className={inputCls + " mt-1"} value={editing.vals[f.key]} onChange={e => setEditing({ ...editing, vals: { ...editing.vals, [f.key]: e.target.value } })}>{f.options!.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
                : <input type={f.type === "number" ? "number" : "text"} min={0} className={inputCls + " mt-1"} value={editing.vals[f.key]} onChange={e => setEditing({ ...editing, vals: { ...editing.vals, [f.key]: e.target.value } })} />}
            </label>
          ))}
          <div className="sm:col-span-2 flex gap-2">
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-xl gradient-bg px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Salvează</button>
            <button onClick={() => setEditing(null)} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary">Anulează</button>
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{cfg.empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(r => (
            <li key={r.id} className="py-3 flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{cfg.title(r)}</div>
                {cfg.sub && <div className="text-sm text-muted-foreground line-clamp-2">{cfg.sub(r)}</div>}
              </div>
              {canEdit && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => open(r)} aria-label="Editează" className="rounded-lg p-2 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(r.id)} aria-label="Șterge" className="rounded-lg p-2 hover:bg-secondary text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
