import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Bell, Loader2, Download, Trash2, ShieldAlert, Webhook, Brain, Building2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { exportMyData, deleteMyAccount } from "@/lib/account.functions";
import { getBrandWebhook, saveBrandWebhook, deleteBrandWebhook, testBrandWebhook } from "@/lib/webhooks.functions";
import { useNavigate } from "@tanstack/react-router";
import { getBrandQuota } from "@/lib/brands.functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Setări — Social Spark" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const exportFn = useServerFn(exportMyData);
  const deleteFn = useServerFn(deleteMyAccount);
  const brandQuotaFn = useServerFn(getBrandQuota);
  const [isAgency, setIsAgency] = useState(false);
  const [prefs, setPrefs] = useState({
    notify_on_publish_success: true,
    notify_on_publish_failure: true,
    notify_on_quota_reset: true,
    notify_weekly_summary: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => {
    brandQuotaFn().then((r) => setIsAgency(!!(r as { isAgency?: boolean }).isAgency)).catch(() => {});
  }, []);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();
    if (data) setPrefs(data);
    setLoading(false);
  })(); }, []);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notification_preferences").upsert({ user_id: user.id, ...prefs });
    toast.success("Preferințe salvate.");
    setSaving(false);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportFn();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `social-spark-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Datele tale au fost descărcate.");
    } catch (e: any) {
      toast.error(e?.message ?? "Export eșuat");
    } finally { setExporting(false); }
  }

  async function handleDelete() {
    if (confirmDelete !== "ȘTERGE") { toast.error('Tastează exact "ȘTERGE" pentru confirmare.'); return; }
    setDeleting(true);
    try {
      await deleteFn();
      await supabase.auth.signOut();
      toast.success("Contul tău a fost șters.");
      navigate({ to: "/" });
    } catch (e: any) {
      toast.error(e?.message ?? "Ștergere eșuată");
      setDeleting(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-muted-foreground">Se încarcă...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Setări cont</h1>
          <p className="text-muted-foreground mt-1">Afacerea ta, notificări, date personale, securitate.</p>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-6 space-y-3">
        <h2 className="font-display text-lg font-bold">Afacerea ta</h2>
        <SettingsLink
          to="/dashboard/brand-brain"
          icon={Brain}
          title="Profilul afacerii"
          text="Serviciile, prețurile și tonul pe care AI-ul le folosește în postări. Doar informațiile confirmate de tine."
        />
        <SettingsLink
          to="/dashboard/brands"
          icon={Building2}
          title={isAgency ? "Clienți" : "Branduri"}
          text={isAgency ? "Adaugă și administrează clienții agenției tale." : "Administrează brandurile din cont."}
        />
      </div>

      <div className="glass-strong rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-lg font-bold flex items-center gap-2"><Bell className="h-4 w-4" /> Notificări email</h2>
        {Object.entries({
          notify_on_publish_success: "La publicare reușită",
          notify_on_publish_failure: "La eroare de publicare",
          notify_on_quota_reset: "Când cota lunară se resetează",
          notify_weekly_summary: "Rezumat săptămânal de performanță",
        }).map(([k, label]) => (
          <label key={k} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">{label}</span>
            <input type="checkbox" checked={(prefs as any)[k]}
              onChange={e => setPrefs({ ...prefs, [k]: e.target.checked })}
              className="h-5 w-5 accent-primary" />
          </label>
        ))}
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 gradient-bg rounded-lg px-4 py-2.5 text-sm font-semibold text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvează
        </button>
      </div>

      <CrmWebhookCard />

      <div className="glass-strong rounded-2xl p-6 space-y-4">
        <h2 className="font-display text-lg font-bold flex items-center gap-2"><Download className="h-4 w-4" /> Datele tale (GDPR)</h2>
        <p className="text-sm text-muted-foreground">
          Conform GDPR, ai dreptul să descarci toate datele tale într-un fișier JSON: profil, brand-uri, postări, conexiuni Meta, notificări.
        </p>
        <button onClick={handleExport} disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportă datele mele
        </button>
      </div>


      <div className="rounded-2xl border border-red-500/40 bg-red-500/5 p-6 space-y-4">
        <h2 className="font-display text-lg font-bold flex items-center gap-2 text-red-400">
          <ShieldAlert className="h-4 w-4" /> Zonă periculoasă
        </h2>
        <p className="text-sm text-muted-foreground">
          Ștergerea contului este permanentă și ireversibilă. Vom șterge profilul tău, toate brand-urile pe care le deții, postările, conexiunile Meta și istoricul. Această acțiune nu poate fi anulată.
        </p>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tastează <strong>ȘTERGE</strong> pentru a confirma:</label>
          <input value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)}
            className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-red-500" />
        </div>
        <button onClick={handleDelete} disabled={deleting || confirmDelete !== "ȘTERGE"}
          className="inline-flex items-center gap-2 rounded-lg bg-red-500/90 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white">
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Șterge contul permanent
        </button>
      </div>
    </div>
  );
}


function SettingsLink({ to, icon: Icon, title, text }: { to: string; icon: typeof Brain; title: string; text: string }) {
  return (
    <Link to={to} className="flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:bg-secondary">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function CrmWebhookCard() {
  const getFn = useServerFn(getBrandWebhook);
  const saveFn = useServerFn(saveBrandWebhook);
  const delFn = useServerFn(deleteBrandWebhook);
  const testFn = useServerFn(testBrandWebhook);
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [events, setEvents] = useState<string[]>(["lead.created"]);
  const [active, setActive] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { (async () => {
    const r = await getFn();
    if ((r as any).webhook) {
      const w = (r as any).webhook;
      setUrl(w.url); setSecret(w.secret); setEvents(w.events); setActive(w.active); setConfigured(true);
    }
    setLoaded(true);
  })(); }, []);

  const toggleEvent = (e: string) => setEvents(ev => ev.includes(e) ? ev.filter(x => x !== e) : [...ev, e]);

  async function save() {
    setBusy(true);
    try {
      const r = await saveFn({ data: { url, events: events as any, active } });
      setSecret((r as any).secret); setConfigured(true);
      toast.success("Webhook CRM salvat.");
    } catch (e: any) { toast.error(e?.message ?? "Eroare la salvare"); } finally { setBusy(false); }
  }

  if (!loaded) return null;
  return (
    <div className="glass-strong rounded-2xl p-6 space-y-4">
      <h2 className="font-display text-lg font-bold flex items-center gap-2"><Webhook className="h-4 w-4" /> Integrare CRM (webhook)</h2>
      <p className="text-sm text-muted-foreground">
        Primești automat în CRM-ul tău un eveniment semnat (HMAC) când apare un lead nou sau când AI-ul trimite un răspuns automat.
      </p>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Adresa webhook (HTTPS)</label>
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://crm-ul-tau.ro/webhook"
          className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
      </div>
      <div className="flex flex-wrap gap-4">
        {([["lead.created", "Lead nou"], ["reply.auto_sent", "Răspuns automat trimis"]] as const).map(([e, label]) => (
          <label key={e} className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={events.includes(e)} onChange={() => toggleEvent(e)} className="h-4 w-4 accent-primary" /> {label}
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-4 w-4 accent-primary" /> Activ
        </label>
      </div>
      {secret && (
        <div className="rounded-lg bg-secondary/40 p-3 text-xs">
          <span className="text-muted-foreground">Cheia secretă de verificare a semnăturii: </span>
          <code className="font-mono break-all">{secret}</code>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={busy || !url || events.length === 0}
          className="inline-flex items-center gap-2 gradient-bg rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Salvează webhook
        </button>
        {configured && (
          <>
            <button onClick={async () => { setBusy(true); try { await testFn(); toast.success("Eveniment de test trimis."); } catch (e: any) { toast.error(e?.message ?? "Eroare"); } finally { setBusy(false); } }}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary">Trimite test</button>
            <button onClick={async () => { setBusy(true); try { await delFn(); setUrl(""); setSecret(""); setConfigured(false); toast.success("Webhook șters."); } finally { setBusy(false); } }}
              className="rounded-lg border border-red-500/40 text-red-500 px-4 py-2.5 text-sm font-semibold hover:bg-red-500/10">Șterge</button>
          </>
        )}
      </div>
    </div>
  );
}
