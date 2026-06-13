import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { updatePost } from "@/lib/posts.functions";
import { History, Search, Trash2, Pencil, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/history")({
  head: () => ({ meta: [{ title: "Istoric postări — Social Spark" }] }),
  component: HistoryPage,
});

type P = { id: string; title: string|null; copy: string|null; hashtags: string|null; call_to_action: string|null;
  status: string; platform: string; created_at: string; published_at: string|null; last_publish_error: string|null };

function HistoryPage() {
  const [posts, setPosts] = useState<P[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [editId, setEditId] = useState<string|null>(null);
  const [edit, setEdit] = useState<Partial<P>>({});
  const [saving, setSaving] = useState(false);
  const save = useServerFn(updatePost);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("generated_posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPosts((data ?? []) as P[]);
  }
  useEffect(() => { load(); }, []);

  const filtered = posts.filter(p => {
    if (status !== "all" && p.status !== status) return false;
    if (q && !((p.title ?? "") + (p.copy ?? "")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function del(id: string) {
    if (!confirm("Sigur ștergi postarea?")) return;
    await supabase.from("generated_posts").delete().eq("id", id);
    setPosts(p => p.filter(x => x.id !== id));
    toast.success("Șters.");
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      await save({ data: { postId: editId, ...edit } as any });
      setPosts(p => p.map(x => x.id === editId ? { ...x, ...edit } as P : x));
      setEditId(null); toast.success("Actualizat.");
    } catch (e: any) { toast.error(e?.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Istoric postări</h1>
          <p className="text-muted-foreground mt-1">Caută, editează sau șterge orice postare din contul tău.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Caută în titlu sau text..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-input/50 border border-border text-sm outline-none focus:border-primary" />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="rounded-lg bg-input/50 border border-border px-3 py-2.5 text-sm outline-none focus:border-primary">
          <option value="all" className="bg-card">Toate ({posts.length})</option>
          <option value="draft" className="bg-card">Draft</option>
          <option value="scheduled" className="bg-card">Programate</option>
          <option value="published" className="bg-card">Publicate</option>
          <option value="failed" className="bg-card">Eșuate</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
          {posts.length === 0 ? "Nu ai postări încă. Generează prima ta postare!" : "Niciun rezultat pentru filtrele curente."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="glass rounded-xl p-4">
              {editId === p.id ? (
                <div className="space-y-2">
                  <input value={edit.title ?? ""} onChange={e => setEdit({ ...edit, title: e.target.value })}
                    className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm font-semibold outline-none focus:border-primary" />
                  <textarea value={edit.copy ?? ""} onChange={e => setEdit({ ...edit, copy: e.target.value })} rows={5}
                    className="w-full bg-input/50 border border-border rounded px-3 py-2 text-sm outline-none focus:border-primary" />
                  <input value={edit.hashtags ?? ""} onChange={e => setEdit({ ...edit, hashtags: e.target.value })}
                    className="w-full bg-input/50 border border-border rounded px-3 py-2 text-xs text-accent outline-none focus:border-primary" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditId(null)} className="text-xs text-muted-foreground px-3 py-1.5">Anulează</button>
                    <button onClick={saveEdit} disabled={saving} className="inline-flex items-center gap-1 gradient-bg rounded-lg px-3 py-1.5 text-xs font-semibold text-white">
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Salvează
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium truncate">{p.title ?? "(fără titlu)"}</span>
                      <StatusBadge s={p.status} />
                      <span className="text-[10px] text-muted-foreground capitalize">{p.platform}</span>
                    </div>
                    {p.copy && <p className="text-xs text-muted-foreground line-clamp-2">{p.copy}</p>}
                    {p.hashtags && <p className="text-[10px] text-accent mt-1 line-clamp-1">{p.hashtags}</p>}
                    {p.last_publish_error && (
                      <div className="mt-2 flex items-start gap-1 text-[10px] text-destructive">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /><span>{p.last_publish_error}</span>
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(p.created_at).toLocaleDateString("ro-RO")}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditId(p.id); setEdit(p); }}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => del(p.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string,string> = { draft:"bg-muted text-muted-foreground", scheduled:"bg-primary/20 text-primary",
    published:"bg-green-500/20 text-green-400", failed:"bg-destructive/20 text-destructive" };
  const l: Record<string,string> = { draft:"Draft", scheduled:"Programată", published:"Publicată", failed:"Eșuată" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] ${map[s] ?? map.draft}`}>{l[s] ?? s}</span>;
}
