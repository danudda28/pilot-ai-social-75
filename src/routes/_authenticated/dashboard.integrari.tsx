import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getMetaAuthUrl,
  getMetaConnections,
  disconnectMetaConnection,
} from "@/lib/meta.functions";
import { toast } from "sonner";
import { Instagram, Facebook, Plug, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";

const search = z.object({
  meta_connected: z.coerce.number().optional(),
  meta_error: z.string().optional(),
}).partial();

export const Route = createFileRoute("/_authenticated/dashboard/integrari")({
  head: () => ({ meta: [{ title: "Integrări — Social Spark" }] }),
  validateSearch: search,
  component: Integrations,
});

type Connection = {
  id: string;
  fb_user_name: string | null;
  page_id: string;
  page_name: string;
  ig_business_id: string | null;
  ig_username: string | null;
  token_expires_at: string | null;
  created_at: string;
};

function Integrations() {
  const sp = useSearch({ from: "/_authenticated/dashboard/integrari" });
  const list = useServerFn(getMetaConnections);
  const authUrl = useServerFn(getMetaAuthUrl);
  const disconnect = useServerFn(disconnectMetaConnection);
  const [conns, setConns] = useState<Connection[]>([]);
  const [connecting, setConnecting] = useState(false);

  async function refresh() {
    try { setConns((await list()) as Connection[]); } catch {}
  }
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (sp.meta_connected) toast.success(`${sp.meta_connected} pagină/i conectate!`);
    if (sp.meta_error) toast.error(`Conectare eșuată: ${sp.meta_error}`);
  }, [sp.meta_connected, sp.meta_error]);

  async function onConnect() {
    setConnecting(true);
    try {
      const { url } = await authUrl({ data: { origin: window.location.origin } });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Eroare");
      setConnecting(false);
    }
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
        <p className="text-muted-foreground mt-1">Conectează paginile Facebook și conturile Instagram Business.</p>
      </div>

      <div className="glass-strong rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl gradient-bg shrink-0">
            <Facebook className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-lg">Facebook & Instagram</div>
            <p className="text-sm text-muted-foreground mt-1">
              Login direct cu Facebook. Selectezi paginile, noi le conectăm cu conturile IG Business asociate.
            </p>
          </div>
        </div>
        <button
          onClick={onConnect}
          disabled={connecting}
          className="inline-flex items-center gap-2 rounded-xl gradient-bg glow px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 shrink-0"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
          {conns.length > 0 ? "Adaugă alte pagini" : "Conectează cu Facebook"}
        </button>
      </div>

      {conns.length > 0 && (
        <div>
          <h2 className="font-display text-xl font-bold mb-4">Conturi conectate</h2>
          <div className="glass rounded-2xl divide-y divide-border/40">
            {conns.map(c => {
              const expired = c.token_expires_at && new Date(c.token_expires_at) < new Date();
              return (
                <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Facebook className="h-5 w-5 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{c.page_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                        <span>Pagină FB</span>
                        {c.ig_username && (
                          <>
                            <span>·</span>
                            <span className="inline-flex items-center gap-1"><Instagram className="h-3 w-3 text-pink-400" />@{c.ig_username}</span>
                          </>
                        )}
                        {expired && <span className="text-amber-400">· token expirat — reconectează</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive p-2 shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-6 text-sm text-muted-foreground space-y-2">
        <div className="font-semibold text-foreground flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Cum funcționează</div>
        <p>
          Folosim OAuth oficial Meta. Token-urile sunt long-lived (~60 zile) și stocate criptat.
          Le folosim doar pentru publicarea conținutului tău. Poți deconecta oricând.
        </p>
        <p>
          <strong>Instagram</strong> trebuie să fie cont <em>Business</em> sau <em>Creator</em> asociat unei pagini Facebook.
        </p>
      </div>
    </div>
  );
}
