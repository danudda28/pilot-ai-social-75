import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getBrandBrain, updateBrandProfile, saveVoiceRules } from "@/lib/brand-brain.functions";
import { scanWebsite, applyScanResults, generateFirstPosts, type ScanResult } from "@/lib/business-scan.functions";
import { TEMPLATES } from "@/lib/templates";
import { Panel, ProgressBar, SkeletonBlock } from "@/components/ui-kit";
import { Loader2, Globe, Check, X, Sparkles, Plug, Bot, ArrowRight, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/onboarding")({
  head: () => ({ meta: [{ title: "Configurare — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: Onboarding,
});

const STEPS = ["Afacerea ta", "Scanare", "Confirmare", "Identitate", "Conectare", "Prima valoare"];
const GOALS = [
  { v: "vizibilitate", l: "Mai multă vizibilitate" }, { v: "mesaje", l: "Mai multe mesaje" },
  { v: "programari", l: "Programări" }, { v: "comenzi", l: "Comenzi" }, { v: "trafic", l: "Trafic pe site" },
];
const TONES = ["prietenos", "profesionist", "premium", "energic", "educațional", "direct"];
const SCAN_MESSAGES = ["Accesez website-ul…", "Citesc paginile publice…", "Caut servicii și prețuri…", "Caut contact și program…", "Organizez informațiile…"];

const inputCls = "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

type Selectable<T> = T & { keep: boolean };

function Onboarding() {
  const navigate = useNavigate();
  const brainFn = useServerFn(getBrandBrain);
  const updateFn = useServerFn(updateBrandProfile);
  const voiceFn = useServerFn(saveVoiceRules);
  const scanFn = useServerFn(scanWebsite);
  const applyFn = useServerFn(applyScanResults);
  const postsFn = useServerFn(generateFirstPosts);

  const [brandId, setBrandId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", website_url: "", primary_goal: "vizibilitate", city: "", country: "România" });
  const [scanMsg, setScanMsg] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | undefined>();
  const [profile, setProfile] = useState<Record<string, { value: string; keep: boolean }>>({});
  const [locations, setLocations] = useState<Selectable<ScanResult["locations"][number]>[]>([]);
  const [products, setProducts] = useState<Selectable<ScanResult["products"][number]>[]>([]);
  const [faqs, setFaqs] = useState<Selectable<ScanResult["faqs"][number]>[]>([]);
  const [policies, setPolicies] = useState<Selectable<ScanResult["policies"][number]>[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [voice, setVoice] = useState({ tone: "prietenos", address_form: "tu" as "tu" | "dumneavoastra", emoji_level: "putine" as "fara" | "putine" | "moderate", text_length: "mediu" as "scurt" | "mediu" | "lung", banned: "", phrases: "" });
  const [postCount, setPostCount] = useState<number | null>(null);

  useEffect(() => {
    brainFn({ data: {} }).then((b: any) => {
      setBrandId(b.brand.id);
      setForm(f => ({
        ...f, name: b.brand.name === "Brandul meu" ? "" : b.brand.name, category: b.brand.category ?? "",
        website_url: b.brand.website_url ?? "", primary_goal: b.brand.primary_goal ?? "vizibilitate",
        city: b.brand.city ?? "", country: b.brand.country ?? "România",
      }));
      if (b.voice) setVoice(v => ({ ...v, tone: b.voice.tone, address_form: b.voice.address_form, emoji_level: b.voice.emoji_level, text_length: b.voice.text_length, banned: b.voice.banned_words.join(", "), phrases: b.voice.preferred_phrases.join(", ") }));
      if (b.voice?.colors?.length) setColors(b.voice.colors);
    }).catch((e: any) => toast.error(e?.message ?? "Nu am putut încărca brandul."));
  }, []);

  async function saveStep1() {
    if (!brandId) return;
    if (form.name.trim().length < 2 || !form.category) { toast.error("Completează numele și domeniul afacerii."); return; }
    setBusy(true);
    try {
      await updateFn({ data: { brandId, fields: { ...form, website_url: form.website_url || null, onboarding_step: 1 } } });
      if (form.website_url.trim()) { setStep(1); runScan(); }
      else setStep(3);
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(false); }
  }

  async function runScan() {
    if (!brandId) return;
    setScanError(null); setScanMsg(0);
    const timer = setInterval(() => setScanMsg(m => Math.min(m + 1, SCAN_MESSAGES.length - 1)), 3500);
    try {
      const r: any = await scanFn({ data: { brandId, url: form.website_url } });
      const res: ScanResult = r.result;
      setScanId(r.scanId);
      const p: Record<string, { value: string; keep: boolean }> = {};
      Object.entries(res.profile ?? {}).forEach(([k, v]) => { if (v) p[k] = { value: String(v), keep: true }; });
      setProfile(p);
      setLocations(res.locations.map(x => ({ ...x, keep: true })));
      setProducts(res.products.map(x => ({ ...x, keep: true })));
      setFaqs(res.faqs.map(x => ({ ...x, keep: true })));
      setPolicies(res.policies.map(x => ({ ...x, keep: true })));
      if (res.colors.length) setColors(res.colors);
      setStep(2);
    } catch (e: any) { setScanError(e?.message ?? "Scanarea a eșuat."); }
    finally { clearInterval(timer); }
  }

  async function confirmScan() {
    if (!brandId) return;
    setBusy(true);
    try {
      const prof: Record<string, string> = {};
      Object.entries(profile).forEach(([k, v]) => { if (v.keep && v.value.trim()) prof[k] = v.value.trim(); });
      if (form.name) prof.name = form.name;
      const strip = <T extends { keep: boolean }>(arr: T[]) => arr.filter(x => x.keep).map(({ keep, ...rest }) => rest);
      await applyFn({ data: { brandId, scanId, profile: prof, locations: strip(locations), products: strip(products), faqs: strip(faqs), policies: strip(policies), colors } });
      setStep(3);
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(false); }
  }

  async function saveVoice() {
    if (!brandId) return;
    setBusy(true);
    const split = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);
    try {
      await voiceFn({ data: { brandId, tone: voice.tone, address_form: voice.address_form, emoji_level: voice.emoji_level, text_length: voice.text_length, banned_words: split(voice.banned), preferred_phrases: split(voice.phrases), example_posts: [], example_replies: [], colors, fonts: [] } });
      setStep(4);
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(false); }
  }

  async function firstValue() {
    if (!brandId) return;
    setBusy(true);
    try { const r: any = await postsFn({ data: { brandId } }); setPostCount(r.count); }
    catch (e: any) { toast.error(e?.message); }
    finally { setBusy(false); }
  }

  async function skip() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("users_profiles").update({ onboarding_completed: true }).eq("user_id", user.id);
    navigate({ to: "/dashboard" });
  }

  if (!brandId) return <div className="max-w-2xl mx-auto space-y-4"><SkeletonBlock className="h-8 w-48" /><SkeletonBlock className="h-96" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-muted-foreground">Pasul {step + 1} din {STEPS.length} · {STEPS[step]}</span>
        <button onClick={skip} className="text-muted-foreground hover:text-foreground">Termin mai târziu</button>
      </div>
      <ProgressBar value={((step + 1) / STEPS.length) * 100} />

      <Panel className="mt-6">
        {step === 0 && (
          <div className="space-y-4">
            <div><h1 className="font-display text-2xl font-bold">Hai să cunoaștem afacerea ta</h1>
              <p className="text-sm text-muted-foreground mt-1">Durează sub 5 minute. Doar câteva întrebări.</p></div>
            <label className="block text-sm font-medium">Numele afacerii
              <input className={inputCls + " mt-1"} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ex: Salon Bella" /></label>
            <label className="block text-sm font-medium">Domeniul de activitate
              <select className={inputCls + " mt-1"} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">Alege…</option>
                {TEMPLATES.map(t => <option key={t.id} value={t.label}>{t.label}</option>)}
                <option value="Altul">Altul</option>
              </select></label>
            <label className="block text-sm font-medium">Website sau pagina de Facebook (opțional)
              <input className={inputCls + " mt-1"} value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="ex: salonbella.ro" />
              <span className="text-xs text-muted-foreground font-normal">Dacă ai website, îl citim automat ca să nu completezi tu totul.</span></label>
            <div className="text-sm font-medium">Ce vrei să obții în primul rând?</div>
            <div className="flex flex-wrap gap-2">
              {GOALS.map(g => (
                <button key={g.v} type="button" onClick={() => setForm({ ...form, primary_goal: g.v })}
                  className={`rounded-full border px-3 py-1.5 text-sm ${form.primary_goal === g.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"}`}>{g.l}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium">Oraș<input className={inputCls + " mt-1"} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></label>
              <label className="block text-sm font-medium">Țară<input className={inputCls + " mt-1"} value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></label>
            </div>
            <PrimaryBtn busy={busy} onClick={saveStep1}>{form.website_url ? "Scanează website-ul" : "Continuă"}</PrimaryBtn>
          </div>
        )}

        {step === 1 && (
          <div className="py-6 text-center">
            {scanError ? (
              <>
                <X className="h-10 w-10 text-destructive mx-auto" />
                <p className="mt-3 font-medium">{scanError}</p>
                <div className="mt-5 flex justify-center gap-2">
                  <button onClick={runScan} className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary">Încearcă din nou</button>
                  <button onClick={() => setStep(3)} className="rounded-xl gradient-bg px-4 py-2 text-sm font-semibold text-primary-foreground">Continuă fără scanare</button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto h-14 w-14 rounded-2xl gradient-bg grid place-items-center glow"><Globe className="h-7 w-7 text-primary-foreground animate-pulse" /></div>
                <p className="mt-4 font-display text-lg font-semibold">{SCAN_MESSAGES[scanMsg]}</p>
                <p className="text-sm text-muted-foreground mt-1">Citim doar paginile publice. Durează 15–40 de secunde.</p>
                <div className="mt-5 max-w-xs mx-auto"><ProgressBar value={((scanMsg + 1) / SCAN_MESSAGES.length) * 90} /></div>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div><h2 className="font-display text-2xl font-bold">Am găsit aceste informații</h2>
              <p className="text-sm text-muted-foreground mt-1">Verifică-le. Corectează sau debifează ce nu e corect. AI-ul va folosi doar ce confirmi.</p></div>
            {Object.keys(profile).length > 0 && (
              <Section title="Despre afacere">
                {Object.entries(profile).map(([k, v]) => (
                  <Row key={k} keep={v.keep} onToggle={() => setProfile({ ...profile, [k]: { ...v, keep: !v.keep } })}>
                    <div className="text-xs text-muted-foreground">{LABELS[k] ?? k}</div>
                    <input className={inputCls + " mt-1"} value={v.value} onChange={e => setProfile({ ...profile, [k]: { ...v, value: e.target.value } })} />
                  </Row>
                ))}
              </Section>
            )}
            <ListSection title="Locații" items={locations} set={setLocations} render={l => <><b>{l.name}</b>{l.address && ` · ${l.address}`}{l.hours && <div className="text-xs text-muted-foreground">Program: {l.hours}</div>}</>} />
            <ListSection title="Produse și servicii" items={products} set={setProducts} render={p => <><b>{p.name}</b>{p.price ? ` · ${p.price}` : <span className="text-muted-foreground"> · preț necunoscut</span>}</>} />
            <ListSection title="Întrebări frecvente" items={faqs} set={setFaqs} render={f => <><b>{f.question}</b><div className="text-muted-foreground">{f.answer}</div></>} />
            <ListSection title="Politici" items={policies} set={setPolicies} render={p => <><b>{p.title}</b><div className="text-muted-foreground line-clamp-2">{p.content}</div></>} />
            {colors.length > 0 && (
              <Section title="Culori găsite">
                <div className="flex flex-wrap gap-2">{colors.map(c => (
                  <button key={c} onClick={() => setColors(colors.filter(x => x !== c))} title="Elimină" className="flex items-center gap-1.5 rounded-full border border-border px-2 py-1 text-xs">
                    <span className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />{c}<X className="h-3 w-3" /></button>
                ))}</div>
              </Section>
            )}
            {Object.keys(profile).length + locations.length + products.length + faqs.length === 0 && (
              <p className="text-sm text-muted-foreground">Nu am găsit informații utile pe website. Le poți adăuga manual în Brand Brain.</p>
            )}
            <PrimaryBtn busy={busy} onClick={confirmScan}>Confirm informațiile bifate</PrimaryBtn>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div><h2 className="font-display text-2xl font-bold">Cum vorbește brandul tău?</h2>
              <p className="text-sm text-muted-foreground mt-1">AI-ul va scrie postările exact în acest stil.</p></div>
            <div className="text-sm font-medium">Ton</div>
            <Chips options={TONES.map(t => ({ v: t, l: t }))} value={voice.tone} onChange={v => setVoice({ ...voice, tone: v })} />
            <div className="text-sm font-medium">Cum te adresezi clienților</div>
            <Chips options={[{ v: "tu", l: "Tu (informal)" }, { v: "dumneavoastra", l: "Dumneavoastră (formal)" }]} value={voice.address_form} onChange={v => setVoice({ ...voice, address_form: v as any })} />
            <div className="text-sm font-medium">Emoji</div>
            <Chips options={[{ v: "fara", l: "Fără" }, { v: "putine", l: "Puține" }, { v: "moderate", l: "Moderate" }]} value={voice.emoji_level} onChange={v => setVoice({ ...voice, emoji_level: v as any })} />
            <div className="text-sm font-medium">Lungimea textelor</div>
            <Chips options={[{ v: "scurt", l: "Scurte" }, { v: "mediu", l: "Medii" }, { v: "lung", l: "Lungi" }]} value={voice.text_length} onChange={v => setVoice({ ...voice, text_length: v as any })} />
            <label className="block text-sm font-medium">Expresii preferate (separate prin virgulă)
              <input className={inputCls + " mt-1"} value={voice.phrases} onChange={e => setVoice({ ...voice, phrases: e.target.value })} placeholder="ex: te așteptăm cu drag" /></label>
            <label className="block text-sm font-medium">Cuvinte interzise (separate prin virgulă)
              <input className={inputCls + " mt-1"} value={voice.banned} onChange={e => setVoice({ ...voice, banned: e.target.value })} placeholder="ex: ieftin, cel mai bun" /></label>
            <div className="flex gap-2">
              <button onClick={() => setStep(0)} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary"><ArrowLeft className="h-4 w-4" /></button>
              <PrimaryBtn busy={busy} onClick={saveVoice}>Salvează și continuă</PrimaryBtn>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold">Conectare și reguli</h2>
            <div className="rounded-xl border border-border p-4 flex gap-3">
              <Plug className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm"><div className="font-medium">Facebook și Instagram</div>
                <p className="text-muted-foreground">Conectarea se face din pagina Integrări, prin autorizarea oficială Meta. O poți face acum sau mai târziu.</p>
                <Link to="/dashboard/integrari" className="mt-2 inline-flex text-primary font-medium">Deschide Integrări</Link></div>
            </div>
            <div className="rounded-xl border border-border p-4 flex gap-3 opacity-80">
              <Bot className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm"><div className="font-medium">Regulile agentului AI pentru mesaje <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">În curând</span></div>
                <p className="text-muted-foreground">Răspunsurile automate la mesaje și comentarii vor fi disponibile odată cu Inbox AI. Până atunci, AI-ul nu răspunde nimănui în numele tău.</p></div>
            </div>
            <PrimaryBtn busy={false} onClick={() => setStep(5)}>Continuă</PrimaryBtn>
          </div>
        )}

        {step === 5 && (
          <div className="py-4 text-center space-y-4">
            {postCount === null ? (
              <>
                <div className="mx-auto h-14 w-14 rounded-2xl gradient-bg grid place-items-center glow"><Sparkles className={`h-7 w-7 text-primary-foreground ${busy ? "animate-pulse" : ""}`} /></div>
                <h2 className="font-display text-2xl font-bold">Primele tale 7 postări</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">Le scriem pe baza informațiilor confirmate. Ajung ca drafturi, nimic nu se publică fără acordul tău.</p>
                <PrimaryBtn busy={busy} onClick={firstValue}>{busy ? "Se generează…" : "Generează primele postări"}</PrimaryBtn>
              </>
            ) : (
              <>
                <Check className="h-12 w-12 text-success mx-auto" />
                <h2 className="font-display text-2xl font-bold">Gata! {postCount} drafturi te așteaptă</h2>
                <p className="text-sm text-muted-foreground">Revizuiește-le și programează-le în calendar.</p>
                <div className="flex justify-center gap-2">
                  <Link to="/dashboard/history" className="rounded-xl gradient-bg px-4 py-2.5 text-sm font-semibold text-primary-foreground inline-flex items-center gap-2">Vezi postările <ArrowRight className="h-4 w-4" /></Link>
                  <Link to="/dashboard" className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary">Acasă</Link>
                </div>
              </>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}

const LABELS: Record<string, string> = {
  name: "Nume", short_description: "Descriere scurtă", long_description: "Descriere detaliată", category: "Categorie",
  target_audience: "Public țintă", differentiators: "Ce vă diferențiază", phone: "Telefon", email: "Email",
  whatsapp: "WhatsApp", booking_url: "Link programare/comandă", city: "Oraș",
};

function PrimaryBtn({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button disabled={busy} onClick={onClick}
      className="flex-1 w-full inline-flex items-center justify-center gap-2 rounded-xl gradient-bg px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}{children}
    </button>
  );
}

function Chips({ options, value, onChange }: { options: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`rounded-full border px-3 py-1.5 text-sm capitalize ${value === o.v ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"}`}>{o.l}</button>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><div className="text-sm font-semibold mb-2">{title}</div><div className="space-y-2">{children}</div></div>;
}

function Row({ keep, onToggle, children }: { keep: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className={`flex gap-3 rounded-xl border p-3 ${keep ? "border-border" : "border-dashed border-border opacity-50"}`}>
      <button onClick={onToggle} aria-label={keep ? "Elimină" : "Păstrează"}
        className={`h-5 w-5 shrink-0 rounded-md border grid place-items-center mt-0.5 ${keep ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
        {keep && <Check className="h-3.5 w-3.5" />}
      </button>
      <div className="flex-1 min-w-0 text-sm">{children}</div>
    </div>
  );
}

function ListSection<T extends { keep: boolean }>({ title, items, set, render }: { title: string; items: T[]; set: (v: T[]) => void; render: (i: T) => React.ReactNode }) {
  if (!items.length) return null;
  return (
    <Section title={`${title} (${items.filter(i => i.keep).length}/${items.length})`}>
      {items.map((it, idx) => (
        <Row key={idx} keep={it.keep} onToggle={() => set(items.map((x, j) => j === idx ? { ...x, keep: !x.keep } : x))}>{render(it)}</Row>
      ))}
    </Section>
  );
}
