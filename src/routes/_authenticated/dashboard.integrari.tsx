import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  connectSocialAccount,
  disconnectSocialAccount,
  getConnectedAccounts,
  listBufferProfilesFn,
} from "@/lib/publishing.functions";
import { toast } from "sonner";
import { Instagram, Facebook, Plug, Trash2, RefreshCw, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/integrari")({
  head: () => ({ meta: [{ title: "Integrări — AdPilot Social" }] }),
  component: Integrations,
});

type Account = { id: string; platform: string; account_name: string | null; account_id: string | null; status: string };
type Profile = { id: string; service: string; username: string; avatar?: string };

function serviceIcon(s: string) {
  if (s === "instagram") return <Instagram className="h-5 w-5 text-pink-400" />;
  if (s === "facebook") return <Facebook className="h-5 w-5 text-blue-400" />;
  return <Plug className="h-5 w-5 text-muted-foreground" />;
}

function Integrations() {
  const list = useServerFn(getConnectedAccounts);
  const connect = useServerFn(connectSocialAccount);
  const disconnect = useServerFn(disconnectSocialAccount);
  const listProfiles = useServerFn(listBufferProfilesFn);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  async function refresh() {
    try { setAccounts((await list()) as Account[]); } catch {}
  }
  async function refreshProfiles() {
    setProfilesLoading(true);
    setProfilesError(null);
    try {
      setProfiles((await listProfiles()) as Profile[]);
    } catch (e: any) {
      setProfilesError(e?.message ?? "Eroare la conectare cu Buffer.");
    } finally {
      setProfilesLoading(false);
    }
  }
  useEffect(() => { refresh(); refreshProfiles(); }, []);

  const connectedIds = new Set(accounts.map(a => a.account_id).filter(Boolean));

  async function addProfile(p: Profile) {
    if (p.service !== "instagram" && p.service !== "facebook") {
      toast.error("Doar Instagram și Facebook sunt suportate momentan.");
      return;
    }
    setLoading(true);
    try {
      await connect({ data: {
        platform: p.service as "instagram" | "facebook",
        account_name: p.username,
        buffer_profile_id: p.id,
      }});
      toast.success(`@${p.username} a fost conectat.`);
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Eroare"); }
    finally { setLoading(false); }
  }

  async function remove(id: string) {
    if (!window.confirm("Ștergi această conexiune?")) return;
    try {
      await disconnect({ data: { id } });
      toast.success("Deconectat.");
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Eroare"); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Integrări</h1>
        <p className="text-muted-foreground mt-1">Conectează conturile prin Buffer pentru publicare automată.</p>
      </div>

      <div className="glass-strong rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Profiluri Buffer disponibile</h2>
            <p className="text-sm text-muted-foreground">Conturile sociale din workspace-ul tău Buffer.</p>
          </div>
          <button onClick={refreshProfiles} disabled={profilesLoading} className="text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${profilesLoading ? "animate-spin" : ""}`} />
            Reîncarcă
          </button>
        </div>

        {profilesError ? (
          <div className="text-sm text-destructive">{profilesError}</div>
        ) : profilesLoading ? (
          <div className="text-sm text-muted-foreground">Se încarcă profilurile…</div>
        ) : profiles.length === 0 ? (
          <div className="text-sm text-muted-foreground">Niciun profil găsit în Buffer.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {profiles.map(p => {
              const already = connectedIds.has(p.id);
              return (
                <button
                  key={p.id}
                  disabled={loading || already}
                  onClick={() => addProfile(p)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-primary/50 hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed text-left transition-colors"
                >
                  {serviceIcon(p.service)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">@{p.username}</div>
                    <div className="text-xs text-muted-foreground capitalize">{p.service}</div>
                  </div>
                  {already && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-xl font-bold mb-4">Conturi conectate</h2>
        {accounts.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground">
            Nu ai nicio conexiune încă.
          </div>
        ) : (
          <div className="glass rounded-2xl divide-y divide-border/40">
            {accounts.map(a => (
              <div key={a.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {serviceIcon(a.platform)}
                  <div>
                    <div className="font-medium text-sm">{a.account_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{a.platform} · {a.status === "connected" ? "Activ" : a.status}</div>
                  </div>
                </div>
                <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive p-2"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
        <div className="font-semibold text-foreground flex items-center gap-2 mb-2"><Plug className="h-4 w-4" /> Notă tehnică</div>
        Folosim Buffer API ca să programăm și să publicăm postările. Token-ul este salvat ca secret <code className="text-primary">BUFFER_ACCESS_TOKEN</code>. Conturile sociale (Instagram, Facebook) trebuie adăugate mai întâi în contul tău Buffer.
      </div>
    </div>
  );
}
