import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { setApprovalStatus } from "@/lib/posts.functions";
import { CheckCircle2, XCircle, ClipboardCheck, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard/approvals")({
  head: () => ({ meta: [{ title: "Aprobări postări — AdPilot" }] }),
  component: ApprovalsPage,
});

type P = {
  id: string; title: string|null; copy: string|null; hashtags: string|null;
  platform: string; created_at: string; scheduled_date: string|null;
  approval_status: string; status: string; image_url: string|null;
};

function ApprovalsPage() {
  const [posts, setPosts] = useState<P[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending"|"approved"|"rejected"|"all">("pending");
  const [busyId, setBusyId] = useState<string|null>(null);
  const setApproval = useServerFn(setApprovalStatus);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    let q = supabase.from("generated_posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("approval_status", filter);
    const { data } = await q;
    setPosts((data ?? []) as P[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [filter]);

  async function decide(id: string, status: "approved"|"rejected") {
    setBusyId(id);
    try {
      await setApproval({ data: { postId: id, status } });
      toast.success(status === "approved" ? "Postare aprobată." : "Postare respinsă.");
      setPosts(p => filter === "all" ? p.map(x => x.id === id ? { ...x, approval_status: status } : x) : p.filter(x => x.id !== id));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = posts.filter(p => p.approval_status === "pending").length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7 text-primary" /> Aprobări
        </h1>
        <p className="text-muted-foreground mt-1">Verifică și aprobă postările înainte de publicare.</p>
      </header>

      <div className="flex gap-2 flex-wrap">
        {(["pending","approved","rejected","all"] as const).map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "pending" ? "În așteptare" : f === "approved" ? "Aprobate" : f === "rejected" ? "Respinse" : "Toate"}
            {f === "pending" && pendingCount > 0 && filter !== "pending" && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded">{pendingCount}</span>
            )}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
      ) : posts.length === 0 ? (
        <div className="glass-strong rounded-xl p-12 text-center text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Nicio postare {filter === "pending" ? "în așteptare" : filter === "all" ? "" : filter === "approved" ? "aprobată" : "respinsă"}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(p => (
            <div key={p.id} className="glass-strong rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="secondary">{p.platform}</Badge>
                    <Badge variant={p.approval_status === "approved" ? "default" : p.approval_status === "rejected" ? "destructive" : "outline"}>
                      {p.approval_status === "pending" ? "În așteptare" : p.approval_status === "approved" ? "Aprobată" : p.approval_status === "rejected" ? "Respinsă" : p.approval_status}
                    </Badge>
                    {p.scheduled_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {new Date(p.scheduled_date).toLocaleString("ro-RO")}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold truncate">{p.title ?? "(fără titlu)"}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap mt-1">{p.copy}</p>
                  {p.hashtags && <p className="text-xs text-primary mt-2 truncate">{p.hashtags}</p>}
                </div>
                {p.image_url && (
                  <div className="text-xs text-muted-foreground">{/* thumbnail link */}<span className="opacity-60">cu imagine</span></div>
                )}
              </div>
              {p.approval_status === "pending" && (
                <div className="flex gap-2 justify-end border-t border-border/40 pt-3">
                  <Button size="sm" variant="outline" onClick={() => decide(p.id, "rejected")} disabled={busyId === p.id}>
                    <XCircle className="h-4 w-4 mr-1" /> Respinge
                  </Button>
                  <Button size="sm" onClick={() => decide(p.id, "approved")} disabled={busyId === p.id}>
                    {busyId === p.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                    Aprobă
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
