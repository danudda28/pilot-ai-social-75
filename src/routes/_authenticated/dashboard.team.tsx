import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyBrands, inviteMember, listMembers, removeMember } from "@/lib/brands.functions";
import { supabase } from "@/integrations/supabase/client";
import { Users, Mail, Trash2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/team")({
  head: () => ({ meta: [{ title: "Echipă — Social Spark" }] }),
  component: TeamPage,
});

function TeamPage() {
  const list = useServerFn(listMyBrands);
  const invite = useServerFn(inviteMember);
  const members = useServerFn(listMembers);
  const remove = useServerFn(removeMember);
  const [brandId, setBrandId] = useState<string|null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [data, setData] = useState<{ members: any[]; invitations: any[] }>({ members: [], invitations: [] });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor"|"viewer">("editor");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string|null>(null);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    setUserId(user.id);
    const { data: prof } = await supabase.from("users_profiles").select("current_brand_id").eq("user_id", user.id).maybeSingle();
    const bs = await list();
    setBrands(bs as any);
    setBrandId(prof?.current_brand_id ?? (bs as any)[0]?.id ?? null);
  })(); }, []);

  useEffect(() => { if (brandId) members({ data: { brandId } }).then(setData).catch(()=>{}); }, [brandId]);

  const currentBrand = brands.find(b => b.id === brandId);
  const isOwner = currentBrand?.owner_id === userId;

  async function send() {
    if (!brandId || !email) return;
    setLoading(true);
    try {
      const r = await invite({ data: { brandId, email, role } }) as any;
      toast.success("Invitație creată. Link copiat în clipboard.");
      if (r.inviteLink) await navigator.clipboard.writeText(r.inviteLink);
      setEmail("");
      const m = await members({ data: { brandId } }); setData(m);
    } catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Echipa ta</h1>
          <p className="text-muted-foreground mt-1">Invită colegi să gestioneze brandul împreună cu tine.</p>
        </div>
      </div>

      {brands.length > 1 && (
        <select value={brandId ?? ""} onChange={e => setBrandId(e.target.value)}
          className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary">
          {brands.map(b => <option key={b.id} value={b.id} className="bg-card">{b.name}</option>)}
        </select>
      )}

      {!isOwner && (
        <div className="glass rounded-xl p-4 text-sm text-muted-foreground">
          Doar owner-ul brandului poate invita membri noi.
        </div>
      )}

      {isOwner && (
        <div className="glass-strong rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold flex items-center gap-2"><Mail className="h-4 w-4" /> Invită un coleg</h2>
          <div className="grid sm:grid-cols-[1fr,140px,auto] gap-2">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@firma.ro"
              className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
            <select value={role} onChange={e => setRole(e.target.value as any)}
              className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary">
              <option value="editor" className="bg-card">Editor</option>
              <option value="viewer" className="bg-card">Viewer</option>
            </select>
            <button onClick={send} disabled={loading || !email}
              className="rounded-lg gradient-bg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invită"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Editor poate genera și edita postări. Viewer poate doar citi.</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Membri ({data.members.length})</h3>
        <div className="space-y-2">
          {data.members.map(m => (
            <div key={m.id} className="glass rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-mono">{m.user_id === userId ? "Tu" : m.user_id.slice(0, 8) + "..."}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{m.role}</div>
              </div>
              {isOwner && m.user_id !== userId && (
                <button onClick={async () => { await remove({ data: { memberId: m.id } }); members({ data: { brandId: brandId! } }).then(setData); }}
                  className="p-2 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
        </div>
      </div>

      {data.invitations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Invitații pending ({data.invitations.length})</h3>
          <div className="space-y-2">
            {data.invitations.map(i => (
              <div key={i.id} className="glass rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm">{i.email}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{i.role} · expiră {new Date(i.expires_at).toLocaleDateString("ro-RO")}</div>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/invitatie/${i.token}`); toast.success("Link copiat."); }}
                  className="p-2 rounded hover:bg-secondary text-muted-foreground"><Copy className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
