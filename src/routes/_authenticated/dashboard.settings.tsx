import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Bell, Loader2, Download, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { exportMyData, deleteMyAccount } from "@/lib/account.functions";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Setări — Social Spark" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const exportFn = useServerFn(exportMyData);
  const deleteFn = useServerFn(deleteMyAccount);
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
          <p className="text-muted-foreground mt-1">Notificări, date personale, securitate.</p>
        </div>
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
