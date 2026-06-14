import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Sparkles, X, CheckCircle, Building2, Plug, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { TEMPLATES } from "@/lib/templates";

type Step = 1 | 2 | 3;

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [metaConnected, setMetaConnected] = useState(false);
  const [form, setForm] = useState({ company_name: "", business_type: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: prof } = await supabase
        .from("users_profiles")
        .select("business_type,company_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!prof?.business_type) {
        setOpen(true);
        return;
      }
      // Dacă profilul e completat dar nu a marcat tour-ul terminat, verifică Meta și sări la pasul 2.
      const tourDone = localStorage.getItem(`onboarding-done-${user.id}`);
      if (!tourDone) {
        const { data: meta } = await supabase.from("meta_connections").select("id").eq("user_id", user.id).maybeSingle();
        if (meta) setMetaConnected(true);
        setForm({ company_name: prof.company_name ?? "", business_type: prof.business_type ?? "", phone: "" });
        setStep(meta ? 3 : 2);
        setOpen(true);
      }
    })();
  }, []);

  async function saveStep1() {
    if (!userId) return;
    if (!form.business_type || !form.company_name) {
      toast.error("Completează numele și tipul afacerii.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("users_profiles")
      .update({
        company_name: form.company_name,
        business_type: form.business_type,
        phone: form.phone || null,
      })
      .eq("user_id", userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profil salvat!");
    setStep(2);
  }

  function close() {
    if (userId) localStorage.setItem(`onboarding-done-${userId}`, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-strong rounded-2xl p-6 sm:p-8 max-w-xl w-full relative">
        <button onClick={close} aria-label="Închide" className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${
              step >= s ? "bg-primary" : "bg-secondary"
            }`} />
          ))}
        </div>
        <div className="flex items-center gap-2 text-primary mb-2 text-xs uppercase tracking-wider font-medium">
          <Sparkles className="h-3.5 w-3.5" /> Pasul {step} din 3
        </div>

        {step === 1 && (
          <>
            <h2 className="font-display text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" /> Despre afacerea ta
            </h2>
            <p className="text-sm text-muted-foreground mt-2">Câteva detalii și AI-ul va scrie postări fix pentru tine.</p>
            <div className="mt-6 space-y-4">
              <Field label="Numele afacerii" v={form.company_name} on={v => setForm({...form, company_name: v})} placeholder="ex: Salon Bella" />
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tip afacere</label>
                <input list="tpl-list" value={form.business_type}
                  onChange={e => setForm({...form, business_type: e.target.value})}
                  placeholder="ex: salon de înfrumusețare"
                  className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
                <datalist id="tpl-list">
                  {TEMPLATES.map(t => <option key={t.id} value={t.businessType} />)}
                </datalist>
              </div>
              <Field label="Telefon (opțional)" v={form.phone} on={v => setForm({...form, phone: v})} placeholder="07xx xxx xxx" />
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={close} className="rounded-xl glass px-4 py-3 text-sm hover:bg-secondary">Sar peste</button>
              <button onClick={saveStep1} disabled={saving}
                className="flex-1 rounded-xl gradient-bg glow px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {saving ? "Se salvează..." : "Continuă →"}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-display text-2xl font-bold flex items-center gap-2">
              <Plug className="h-6 w-6 text-primary" /> Conectează Instagram & Facebook
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Pentru ca postările să se publice automat, conectează-ți pagina Facebook și contul Instagram Business. Durează 30 de secunde.
            </p>
            <div className="mt-5 rounded-xl bg-secondary/40 p-4 text-xs text-muted-foreground space-y-1">
              <p>📌 Ai nevoie de un cont <strong>Instagram Business</strong> sau <strong>Creator</strong> legat de o pagină Facebook.</p>
              <p>🔒 Tokenul tău e criptat și folosit doar pentru a publica postările tale.</p>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setStep(3)} className="rounded-xl glass px-4 py-3 text-sm hover:bg-secondary">Mai târziu</button>
              <Link to="/dashboard/integrari" onClick={() => setStep(3)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl gradient-bg glow px-4 py-3 text-sm font-semibold text-white">
                <Plug className="h-4 w-4" /> Conectează acum
              </Link>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-display text-2xl font-bold flex items-center gap-2">
              <Wand2 className="h-6 w-6 text-primary" /> Generează prima postare
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {metaConnected
                ? "Meta e conectat ✅. Acum hai să facem prima postare cu AI — durează 10 secunde."
                : "Poți genera postări fără să conectezi Meta. Le copiezi manual sau le programezi din calendar."}
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                "Alege un template (salon, restaurant, magazin...)",
                "Spune AI-ului ce vrei să comunici",
                "Primești text, hashtaguri și imagine generată",
                "Publici instant sau programezi pentru mai târziu",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" /> <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={close}
                className="rounded-xl glass-strong px-4 py-3 text-sm font-semibold hover:bg-secondary">
                Explorez singur
              </button>
              <Link to="/dashboard/generate" onClick={close}
                className="rounded-xl gradient-bg glow px-4 py-3 text-sm font-semibold text-white text-center">
                Începe acum 🚀
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, v, on, placeholder }: { label: string; v: string; on: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input value={v} onChange={e => on(e.target.value)} placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
    </div>
  );
}
