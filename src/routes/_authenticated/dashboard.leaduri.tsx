import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, Loader2, Trash2, Users } from "lucide-react";
import { PageHeader, Panel, SkeletonBlock, EmptyState } from "@/components/ui-kit";
import { listLeads, updateLead, deleteLead, exportLeadsCsv } from "@/lib/leads.functions";

export const Route = createFileRoute("/_authenticated/dashboard/leaduri")({
  head: () => ({ meta: [{ title: "Leaduri — Social Spark" }, { name: "robots", content: "noindex" }] }),
  component: LeadsPage,
});

const STATUSES = [
  { key: "all", label: "Toate" },
  { key: "new", label: "Noi" },
  { key: "contacted", label: "Contactate" },
  { key: "won", label: "Câștigate" },
  { key: "lost", label: "Pierdute" },
] as const;

const NEXT: Record<string, { to: string; label: string }> = {
  new: { to: "contacted", label: "Marchează contactat" },
  contacted: { to: "won", label: "Marchează câștigat" },
};

function LeadsPage() {
  const listFn = useServerFn(listLeads);
  const updateFn = useServerFn(updateLead);
  const deleteFn = useServerFn(deleteLead);
  const csvFn = useServerFn(exportLeadsCsv);
  const [filter, setFilter] = useState<string>("all");
  const [leads, setLeads] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load(f = filter) {
    try { setLeads(await listFn({ data: { status: f as any } })); }
    catch (e: any) { toast.error(e?.message); setLeads([]); }
  }
  useEffect(() => { load(filter); }, [filter]);

  async function setStatus(id: string, status: string) {
    setBusy(id);
    try {
      await updateFn({ data: { id, status: status as any } });
      setLeads(prev => (prev ?? []).map(l => l.id === id ? { ...l, status } : l));
      toast.success("Status actualizat.");
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  }

  async function remove(id: string) {
    if (!confirm("Ștergi acest lead definitiv?")) return;
    setBusy(id);
    try {
      await deleteFn({ data: { id } });
      setLeads(prev => (prev ?? []).filter(l => l.id !== id));
      toast.success("Lead șters.");
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  }

  async function exportCsv() {
    try {
      const { csv } = await csvFn();
      if (!csv) return toast.error("Nu există leaduri de exportat.");
      const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url; a.download = `leaduri-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { toast.error(e?.message); }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="Leaduri" description="Clienții interesați, identificați automat din conversațiile din Inbox (cereri de preț, programări, comenzi)." />

      <div className="flex flex-wrap items-center gap-2">
        {STATUSES.map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm ${filter === s.key ? "bg-primary text-primary-foreground" : "border border-border"}`}>{s.label}</button>
        ))}
        <button onClick={exportCsv} className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-1.5 text-sm">
          <Download className="h-4 w-4" /> Export CSV</button>
      </div>

      {leads === null ? <SkeletonBlock className="h-72" /> : leads.length === 0 ? (
        <Panel>
          <EmptyState icon={<Users className="h-8 w-8" />} title="Niciun lead încă"
            description="Leadurile apar automat când un client cere preț, programare sau comandă în mesaje. Până atunci, verifică Inboxul." />
        </Panel>
      ) : (
        <div className="space-y-3">
          {leads.map(l => (
            <Panel key={l.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{l.customer_name ?? "Client necunoscut"}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{l.intent}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{l.channel === "instagram" || l.channel === "ig_comment" ? "Instagram" : "Facebook"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.status === "new" ? "bg-primary/10 text-primary" : l.status === "won" ? "bg-success/10 text-success" : l.status === "lost" ? "bg-destructive/10 text-destructive" : "bg-secondary"}`}>
                      {STATUSES.find(s => s.key === l.status)?.label ?? l.status}</span>
                  </div>
                  {l.summary && <p className="mt-1.5 text-sm text-muted-foreground">„{l.summary}”</p>}
                  <div className="mt-1 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("ro-RO")}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {NEXT[l.status] && (
                    <button onClick={() => setStatus(l.id, NEXT[l.status].to)} disabled={busy === l.id}
                      className="inline-flex items-center gap-1.5 rounded-xl gradient-bg px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
                      {busy === l.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{NEXT[l.status].label}</button>
                  )}
                  {l.status === "contacted" && (
                    <button onClick={() => setStatus(l.id, "lost")} disabled={busy === l.id}
                      className="rounded-xl border border-border px-3 py-1.5 text-xs">Pierdut</button>
                  )}
                  <button onClick={() => remove(l.id)} disabled={busy === l.id} aria-label="Șterge leadul"
                    className="rounded-xl border border-border p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
