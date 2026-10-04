import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listOrgMembers, updateOrgMemberRole } from "@/lib/org.functions";
import { Panel, SkeletonBlock } from "@/components/ui-kit";

const ROLE_LABELS: Record<string, { l: string; d: string }> = {
  owner: { l: "Proprietar", d: "Control total, inclusiv facturare" },
  admin: { l: "Administrator", d: "Gestionează echipa și setările" },
  marketer: { l: "Marketer", d: "Creează, editează și publică conținut" },
  agent: { l: "Agent", d: "Răspunde în inbox (în curând)" },
  viewer: { l: "Vizualizare", d: "Doar citește" },
};

export function OrgMembersCard() {
  const listFn = useServerFn(listOrgMembers);
  const updateFn = useServerFn(updateOrgMemberRole);
  const [data, setData] = useState<any>(null);

  async function load() { try { setData(await listFn()); } catch (e: any) { toast.error(e?.message); } }
  useEffect(() => { load(); }, []);

  async function change(id: string, role: string) {
    try { await updateFn({ data: { memberId: id, role: role as any } }); toast.success("Rol actualizat."); load(); }
    catch (e: any) { toast.error(e?.message); }
  }

  if (!data) return <SkeletonBlock className="h-40" />;
  if (!data.organization) return null;
  const canManage = data.myRole === "owner" || data.myRole === "admin";

  return (
    <Panel>
      <div className="font-semibold">Organizația {data.organization.name}</div>
      <p className="text-sm text-muted-foreground">Rolurile se aplică pe toate brandurile organizației.</p>
      <ul className="mt-4 divide-y divide-border">
        {data.members.map((m: any) => (
          <li key={m.id} className="py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{m.full_name || m.email || "Membru"}</div>
              <div className="text-xs text-muted-foreground truncate">{m.email}</div>
            </div>
            {canManage && m.role !== "owner" ? (
              <select value={m.role} onChange={e => change(m.id, e.target.value)}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm">
                {["admin", "marketer", "agent", "viewer"].map(r => <option key={r} value={r}>{ROLE_LABELS[r].l}</option>)}
              </select>
            ) : (
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs" title={ROLE_LABELS[m.role]?.d}>{ROLE_LABELS[m.role]?.l ?? m.role}</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
