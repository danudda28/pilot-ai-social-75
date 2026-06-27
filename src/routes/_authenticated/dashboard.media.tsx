import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMyMedia, deleteMedia } from "@/lib/media.functions";
import { Loader2, Trash2, Copy, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard/media")({
  head: () => ({ meta: [{ title: "Galerie media — AdPilot" }] }),
  component: MediaPage,
});

type Item = { path: string; name: string; size: number; createdAt: string | null; url: string | null };

function MediaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useServerFn(listMyMedia);
  const del = useServerFn(deleteMedia);

  async function refresh() {
    setLoading(true);
    try {
      const r = (await load({} as never)) as { items: Item[] };
      setItems(r.items);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); }, []);

  async function remove(path: string) {
    if (!confirm("Ștergi această imagine definitiv?")) return;
    try {
      await del({ data: { path } });
      setItems((s) => s.filter((i) => i.path !== path));
      toast.success("Imagine ștearsă.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <ImageIcon className="h-7 w-7 text-primary" /> Galerie media
          </h1>
          <p className="text-muted-foreground mt-1">Toate imaginile generate sau încărcate pentru postările tale.</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reîncarcă"}
        </Button>
      </header>

      {loading && items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : items.length === 0 ? (
        <div className="glass-strong rounded-xl p-12 text-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nicio imagine încă. Generează una din pagina unei postări.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((i) => (
            <div key={i.path} className="glass-strong rounded-xl overflow-hidden group">
              {i.url ? (
                <img src={i.url} alt={i.name} className="w-full aspect-square object-cover" loading="lazy" />
              ) : (
                <div className="w-full aspect-square bg-secondary flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 opacity-30" />
                </div>
              )}
              <div className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground truncate">{i.name}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1"
                    onClick={() => { if (i.url) { navigator.clipboard.writeText(i.url); toast.success("Link copiat"); } }}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(i.path)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
