import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { connectSocialAccount, disconnectSocialAccount, getConnectedAccounts } from "@/lib/publishing.functions";
import { toast } from "sonner";
import { Instagram, Facebook, Plug, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/integrari")({
  head: () => ({ meta: [{ title: "Integrări — AdPilot Social" }] }),
  component: Integrations,
});

type Account = { id: string; platform: string; account_name: string | null; status: string };

function Integrations() {
  const list = useServerFn(getConnectedAccounts);
  const connect = useServerFn(connectSocialAccount);
  const disconnect = useServerFn(disconnectSocialAccount);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try { setAccounts((await list()) as Account[]); } catch {}
  }
  useEffect(() => { refresh(); }, []);

  async function add(platform: "instagram" | "facebook") {
    const name = window.prompt(`Numele paginii ${platform}:`);
    if (!name) return;
    setLoading(true);
    try {
      await connect({ data: { platform, account_name: name } });
      toast.success("Cont adăugat. (Publicarea reală necesită API key.)");
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
        <p className="text-muted-foreground mt-1">Conectează conturile pentru publicare automată.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <button disabled={loading} onClick={() => add("instagram")} className="glass-strong rounded-2xl p-6 card-hover text-left">
          <Instagram className="h-7 w-7 text-pink-400 mb-3" />
          <div className="font-semibold">Conectează Instagram</div>
          <div className="text-sm text-muted-foreground mt-1">Postări statice, carousels și Reels.</div>
        </button>
        <button disabled={loading} onClick={() => add("facebook")} className="glass-strong rounded-2xl p-6 card-hover text-left">
          <Facebook className="h-7 w-7 text-blue-400 mb-3" />
          <div className="font-semibold">Conectează Facebook</div>
          <div className="text-sm text-muted-foreground mt-1">Pagini de business, postări și video.</div>
        </button>
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
                  {a.platform === "instagram" ? <Instagram className="h-5 w-5 text-pink-400" /> : <Facebook className="h-5 w-5 text-blue-400" />}
                  <div>
                    <div className="font-medium text-sm">{a.account_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{a.platform} · {a.status === "connected" ? "Activ" : "În așteptare API"}</div>
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
        Publicarea reală necesită configurarea unui furnizor API (ex: Ayrshare, Publer, Buffer). Setează <code className="text-primary">SOCIAL_PUBLISHING_API_KEY</code> și <code className="text-primary">SOCIAL_PUBLISHING_API_URL</code> în secrete când ești gata.
      </div>
    </div>
  );
}
