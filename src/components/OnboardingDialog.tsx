import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { TEMPLATES } from "@/lib/templates";

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
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
      if (!prof?.business_type) setOpen(true);
    })();
  }, []);

  async function save() {
    if (!userId) return;
    if (!form.business_type || !form.company_name) {
      toast.error("Completează cel puțin numele afacerii și tipul.");
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
    toast.success("Bun venit! Hai să generăm prima postare.");
    setStep(2);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass-strong rounded-2xl p-6 sm:p-8 max-w-lg w-full relative">
        <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        {step === 1 ? (
          <>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Sparkles className="h-4 w-4" /> <span className="text-xs uppercase tracking-wider font-medium">Onboarding</span>
            </div>
            <h2 className="font-display text-2xl font-bold">Bun venit pe Social Spark!</h2>
            <p className="text-sm text-muted-foreground mt-2">Spune-ne câteva detalii ca AI-ul să scrie postări fix pentru afacerea ta.</p>
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
            <button onClick={save} disabled={saving}
              className="mt-6 w-full rounded-xl gradient-bg glow px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Se salvează..." : "Continuă"}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Sparkles className="h-4 w-4" /> <span className="text-xs uppercase tracking-wider font-medium">Pasul 2/2</span>
            </div>
            <h2 className="font-display text-2xl font-bold">Ești gata 🚀</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Acum poți genera prima ta postare. Pentru publicare automată, conectează contul Instagram/Facebook din Integrări.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link to="/dashboard/generate" onClick={() => setOpen(false)}
                className="rounded-xl gradient-bg glow px-4 py-3 text-sm font-semibold text-white text-center">
                Generează postare
              </Link>
              <Link to="/dashboard/integrari" onClick={() => setOpen(false)}
                className="rounded-xl glass-strong px-4 py-3 text-sm font-semibold text-center">
                Conectează Meta
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
