import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Setări — Social Spark" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [prefs, setPrefs] = useState({
    notify_on_publish_success: true,
    notify_on_publish_failure: true,
    notify_on_quota_reset: true,
    notify_weekly_summary: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  if (loading) return <div className="text-center py-20 text-muted-foreground">Se încarcă...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Setări cont</h1>
          <p className="text-muted-foreground mt-1">Notificări, preferințe, securitate.</p>
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
    </div>
  );
}
