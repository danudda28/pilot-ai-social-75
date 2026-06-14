import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { updatePost, setApprovalStatus, markAsWinner } from "@/lib/posts.functions";
import { suggestImprovements } from "@/lib/ai-suggest.functions";
import { History, Search, Trash2, Pencil, Check, Loader2, AlertCircle, Sparkles, ThumbsUp, ThumbsDown, Trophy, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/history")({
  head: () => ({ meta: [{ title: "Istoric postări — AdPilot" }] }),
  component: HistoryPage,
});

type P = {
  id: string; title: string|null; copy: string|null; hashtags: string|null; call_to_action: string|null;
  status: string; platform: string; created_at: string; published_at: string|null; last_publish_error: string|null;
  variant_group: string|null; variant_label: string|null; is_winner: boolean; approval_status: string;
  engagement_likes: number|null; engagement_comments: number|null; engagement_reach: number|null;
};

type Suggestion = { score: number; strengths: string[]; improvements: string[] };

function HistoryPage() {
  const [posts, setPosts] = useState<P[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [editId, setEditId] = useState<string|null>(null);
  const [edit, setEdit] = useState<Partial<P>>({});
  const [saving, setSaving] = useState(false);
  const [aiPanel, setAiPanel] = useState<{ id: string; loading: boolean; data?: Suggestion } | null>(null);

  const save = useServerFn(updatePost);
  const setApproval = useServerFn(setApprovalStatus);
  const setWinner = useServerFn(markAsWinner);
  const suggest = useServerFn(suggestImprovements);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("generated_posts").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false });
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

  async function approve(id: string, s: "approved" | "rejected") {
    try {
      await setApproval({ data: { postId: id, status: s } });
      setPosts(p => p.map(x => x.id === id ? { ...x, approval_status: s } : x));
      toast.success(s === "approved" ? "Aprobat ✓" : "Respins");
    } catch (e: any) { toast.error(e?.message); }
  }

  async function pickWinner(id: string) {
    try {
      await setWinner({ data: { postId: id } });
      await load();
      toast.success("Marcat ca varianta câștigătoare 🏆");
    } catch (e: any) { toast.error(e?.message); }
  }

  async function runSuggest(id: string) {
    setAiPanel({ id, loading: true });
    try {
      const r = await suggest({ data: { postId: id } }) as Suggestion;
      setAiPanel({ id, loading: false, data: r });
    } catch (e: any) {
      toast.error(e?.message);
      setAiPanel(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Istoric postări</h1>
          <p className="text-muted-foreground mt-1">Caută, editează, aprobă, marchează variantele câștigătoare sau cere sugestii AI.</p>
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
            <div key={p.id} className={`glass rounded-xl p-4 ${p.is_winner ? "ring-2 ring-amber-400/60" : ""}`}>
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
                    <button onClick={saveEdit} disabled={saving}
                      className="inline-flex items-center gap-1 gradient-bg rounded-lg px-3 py-1.5 text-xs font-semibold text-white">
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
                      <ApprovalBadge s={p.approval_status} />
                      {p.variant_label && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] bg-accent/20 text-accent">
                          Var. {p.variant_label}
                        </span>
                      )}
                      {p.is_winner && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 inline-flex items-center gap-1">
                          <Trophy className="h-2.5 w-2.5" /> Câștigătoare
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground capitalize">{p.platform}</span>
                    </div>
                    {p.copy && <p className="text-xs text-muted-foreground line-clamp-2">{p.copy}</p>}
                    {p.hashtags && <p className="text-[10px] text-accent mt-1 line-clamp-1">{p.hashtags}</p>}
                    {(p.engagement_likes || p.engagement_reach) ? (
                      <div className="text-[10px] text-muted-foreground mt-1 flex gap-3">
                        <span>❤ {p.engagement_likes ?? 0}</span>
                        <span>💬 {p.engagement_comments ?? 0}</span>
                        <span>👁 {p.engagement_reach ?? 0}</span>
                      </div>
                    ) : null}
                    {p.last_publish_error && (
                      <div className="mt-2 flex items-start gap-1 text-[10px] text-destructive">
                        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" /><span>{p.last_publish_error}</span>
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(p.created_at).toLocaleDateString("ro-RO")}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 flex-wrap justify-end max-w-[200px]">
                    <IconBtn onClick={() => runSuggest(p.id)} title="Sugestii AI" className="text-accent">
                      <Sparkles className="h-3.5 w-3.5" />
                    </IconBtn>
                    {p.approval_status !== "approved" && (
                      <IconBtn onClick={() => approve(p.id, "approved")} title="Aprobă" className="text-green-400">
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </IconBtn>
                    )}
                    {p.approval_status !== "rejected" && (
                      <IconBtn onClick={() => approve(p.id, "rejected")} title="Respinge" className="text-orange-400">
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </IconBtn>
                    )}
                    {p.variant_group && !p.is_winner && (
                      <IconBtn onClick={() => pickWinner(p.id)} title="Marchează ca varianta câștigătoare" className="text-amber-400">
                        <Trophy className="h-3.5 w-3.5" />
                      </IconBtn>
                    )}
                    <IconBtn onClick={() => { setEditId(p.id); setEdit(p); }} title="Editează">
                      <Pencil className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn onClick={() => del(p.id)} title="Șterge" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                </div>
              )}

              {aiPanel?.id === p.id && (
                <div className="mt-4 border-t border-border/40 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-accent" /> Analiză AI
                      {aiPanel.data && (
                        <span className="text-xs text-muted-foreground">Scor: {aiPanel.data.score}/100</span>
                      )}
                    </div>
                    <button onClick={() => setAiPanel(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {aiPanel.loading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Analizează postarea...
                    </div>
                  ) : aiPanel.data ? (
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="font-medium text-green-400 mb-2">✓ Puncte forte</div>
                        <ul className="space-y-1 text-muted-foreground">
                          {aiPanel.data.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="font-medium text-accent mb-2">↑ Îmbunătățiri</div>
                        <ul className="space-y-1 text-muted-foreground">
                          {aiPanel.data.improvements.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, title, className = "" }: { children: React.ReactNode; onClick: () => void; title: string; className?: string }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-2 rounded-lg hover:bg-secondary text-muted-foreground ${className}`}>
      {children}
    </button>
  );
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string,string> = { draft:"bg-muted text-muted-foreground", scheduled:"bg-primary/20 text-primary",
    published:"bg-green-500/20 text-green-400", failed:"bg-destructive/20 text-destructive" };
  const l: Record<string,string> = { draft:"Draft", scheduled:"Programată", published:"Publicată", failed:"Eșuată" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] ${map[s] ?? map.draft}`}>{l[s] ?? s}</span>;
}

function ApprovalBadge({ s }: { s: string }) {
  if (s === "auto" || !s) return null;
  const map: Record<string,string> = {
    pending: "bg-yellow-500/20 text-yellow-400",
    approved: "bg-green-500/20 text-green-400",
    rejected: "bg-orange-500/20 text-orange-400",
  };
  const l: Record<string,string> = { pending: "În așteptare", approved: "Aprobată", rejected: "Respinsă" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] ${map[s]}`}>{l[s]}</span>;
}
