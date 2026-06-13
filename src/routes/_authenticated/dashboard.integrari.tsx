import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  disconnectSocialAccount,
  getConnectedAccounts,
} from "@/lib/publishing.functions";
import { toast } from "sonner";
import { Instagram, Facebook, Plug, Trash2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/integrari")({
  head: () => ({ meta: [{ title: "Integrări — AdPilot Social" }] }),
  component: Integrations,
});

type Account = { id: string; platform: string; account_name: string | null; account_id: string | null; status: string };

function Integrations() {
  const list = useServerFn(getConnectedAccounts);
  const disconnect = useServerFn(disconnectSocialAccount);
  const [accounts, setAccounts] = useState<Account[]>([]);

  async function refresh() {
    try { setAccounts((await list()) as Account[]); } catch {}
  }
  useEffect(() => { refresh(); }, []);

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
        <p className="text-muted-foreground mt-1">Conectează conturile sociale pentru publicare automată.</p>
      </div>

      <div className="glass-strong rounded-2xl p-6 border border-amber-500/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <div className="font-semibold text-foreground">Publicarea automată este temporar dezactivată</div>
            <p className="text-sm text-muted-foreground">
              Buffer a închis API-ul pentru aplicații noi. Lucrăm la integrarea directă cu{" "}
              <strong>Meta (Facebook & Instagram)</strong> — fiecare user își va conecta contul printr-un singur
              click, fără intermediari și fără costuri suplimentare. Între timp, poți genera postările și să le
              copiezi manual.
            </p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 opacity-50 pointer-events-none">
        <div className="glass-strong rounded-2xl p-6">
          <Instagram className="h-7 w-7 text-pink-400 mb-3" />
          <div className="font-semibold">Instagram</div>
          <div className="text-sm text-muted-foreground mt-1">În curând — login direct cu Facebook.</div>
        </div>
        <div className="glass-strong rounded-2xl p-6">
          <Facebook className="h-7 w-7 text-blue-400 mb-3" />
          <div className="font-semibold">Facebook</div>
          <div className="text-sm text-muted-foreground mt-1">În curând — login direct cu Facebook.</div>
        </div>
      </div>

      {accounts.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-bold mb-4">Conexiuni vechi</h2>
          <div className="glass rounded-2xl divide-y divide-border/40">
            {accounts.map(a => (
              <div key={a.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {a.platform === "instagram"
                    ? <Instagram className="h-5 w-5 text-pink-400" />
                    : <Facebook className="h-5 w-5 text-blue-400" />}
                  <div>
                    <div className="font-medium text-sm">{a.account_name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{a.platform} · inactiv</div>
                  </div>
                </div>
                <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive p-2"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
        <div className="font-semibold text-foreground flex items-center gap-2 mb-2"><Plug className="h-4 w-4" /> Notă tehnică</div>
        Următoarea integrare: <strong>Meta Graph API direct</strong>. Necesită cont Meta for Developers (gratis) + Meta App Review (1-7 zile).
      </div>
    </div>
  );
}
