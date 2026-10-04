import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { getMetaHealth, checkMetaHealth, type ConnectionHealth } from "@/lib/meta.functions";

const SCOPE_LABELS: Record<string, string> = {
  pages_show_list: "listare pagini", pages_manage_posts: "publicare pe pagină", pages_read_engagement: "citire interacțiuni",
  instagram_basic: "acces Instagram", instagram_content_publish: "publicare Instagram",
};
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function MetaHealthPanel() {
  const getFn = useServerFn(getMetaHealth);
  const checkFn = useServerFn(checkMetaHealth);
  const [rows, setRows] = useState<ConnectionHealth[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() { try { setRows(await getFn()); } catch { setRows([]); } }
  useEffect(() => { load(); }, []);

  async function check() {
    setBusy(true);
    try { const r = await checkFn(); await load(); toast.success(`Am verificat ${r.checked} conexiuni.`); }
    catch (e: any) { toast.error(e?.message ?? "Verificarea a eșuat."); }
    finally { setBusy(false); }
  }

  if (!rows || rows.length === 0) return null;
  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="font-display text-xl font-bold flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Starea conexiunii</h2>
        <button onClick={check} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Verifică acum
        </button>
      </div>
      <div className="grid gap-3">
        {rows.map(r => (
          <div key={r.connection_id} className="rounded-2xl border border-border bg-card p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              {r.needs_action ? <AlertTriangle className="h-4 w-4 text-warning" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
              {r.page_name}
              {r.needs_action && <span className="ml-auto rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">Necesită atenție</span>}
            </div>
            <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-muted-foreground">
              <div>Conexiune: <span className="text-foreground">{r.token_valid === null ? "neverificată" : r.token_valid ? "validă" : "invalidă — reconectează"}</span></div>
              <div>Expiră: <span className="text-foreground">{r.expires_at ? fmt(r.expires_at) : "fără expirare cunoscută"}</span></div>
              <div>Instagram: <span className="text-foreground">{r.instagram_linked ? (r.ig_username ? `@${r.ig_username}` : "legat") : "nelegat"}</span></div>
              <div>Ultima verificare: <span className="text-foreground">{fmt(r.last_checked_at)}</span></div>
              <div>Ultima publicare reușită: <span className="text-foreground">{fmt(r.last_success_at)}</span></div>
              <div>Ultima eroare: <span className="text-foreground">{fmt(r.last_failure_at)}</span></div>
            </dl>
            {r.missing_scopes.length > 0 && (
              <p className="mt-2 text-warning">Permisiuni lipsă: {r.missing_scopes.map(s => SCOPE_LABELS[s] ?? s).join(", ")}. Reconectează și acceptă toate permisiunile.</p>
            )}
            {r.last_error && r.needs_action && <p className="mt-1 text-muted-foreground">{r.last_error}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Compact alert for the home page; renders nothing when all connections are healthy. */
export function MetaHealthAlert() {
  const getFn = useServerFn(getMetaHealth);
  const [bad, setBad] = useState<ConnectionHealth[]>([]);
  useEffect(() => { getFn().then(r => setBad(r.filter(x => x.needs_action))).catch(() => {}); }, []);
  if (!bad.length) return null;
  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
      <div className="flex-1">
        <div className="font-semibold">Conexiunea cu Facebook/Instagram are nevoie de atenție</div>
        <p className="text-muted-foreground">{bad.map(b => b.page_name).join(", ")}: verifică starea și reconectează dacă e nevoie, ca postările programate să plece la timp.</p>
      </div>
      <Link to="/dashboard/integrari" className="font-semibold text-primary shrink-0">Vezi</Link>
    </div>
  );
}
