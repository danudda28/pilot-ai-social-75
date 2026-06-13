import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invitatie/$token")({
  head: () => ({ meta: [{ title: "Invitație — Social Spark" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = useParams({ strict: false }) as { token: string };
  const [status, setStatus] = useState<"loading"|"need-auth"|"ready"|"done"|"error">("loading");
  const [invite, setInvite] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => { (async () => {
    const { data: inv } = await supabase.from("brand_invitations").select("*, brands(name)").eq("token", token).maybeSingle();
    if (!inv) { setStatus("error"); return; }
    setInvite(inv);
    const { data: { user } } = await supabase.auth.getUser();
    setStatus(user ? "ready" : "need-auth");
  })(); }, [token]);

  async function accept() {
    setAccepting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatus("need-auth"); setAccepting(false); return; }
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      toast.error(`Această invitație e pentru ${invite.email}, dar ești logat ca ${user.email}.`);
      setAccepting(false); return;
    }
    const { error } = await supabase.from("brand_members").insert({ brand_id: invite.brand_id, user_id: user.id, role: invite.role });
    if (error) { toast.error(error.message); setAccepting(false); return; }
    await supabase.from("brand_invitations").update({ accepted_at: new Date().toISOString() }).eq("token", token);
    setStatus("done"); setAccepting(false);
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="glass-strong rounded-2xl p-8 max-w-md w-full space-y-4 text-center">
        <Mail className="h-10 w-10 mx-auto text-primary" />
        {status === "loading" && <p>Se încarcă...</p>}
        {status === "error" && <p className="text-destructive">Invitație invalidă sau expirată.</p>}
        {status === "need-auth" && (
          <>
            <h1 className="font-display text-2xl font-bold">Invitație la {invite?.brands?.name}</h1>
            <p className="text-sm text-muted-foreground">Trebuie să te autentifici cu {invite?.email} ca să accepți.</p>
            <a href={`/auth?redirect=/invitatie/${token}`} className="inline-block gradient-bg rounded-lg px-5 py-2.5 text-sm font-semibold text-white">Conectează-te</a>
          </>
        )}
        {status === "ready" && (
          <>
            <h1 className="font-display text-2xl font-bold">Acceptă invitația</h1>
            <p className="text-sm text-muted-foreground">Vei deveni <strong>{invite?.role}</strong> al <strong>{invite?.brands?.name}</strong>.</p>
            <button onClick={accept} disabled={accepting}
              className="w-full gradient-bg rounded-lg px-5 py-2.5 text-sm font-semibold text-white">
              {accepting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Acceptă"}
            </button>
          </>
        )}
        {status === "done" && (
          <>
            <Check className="h-12 w-12 mx-auto text-green-400" />
            <h1 className="font-display text-2xl font-bold">Bine ai venit în echipă!</h1>
            <a href="/dashboard" className="inline-block gradient-bg rounded-lg px-5 py-2.5 text-sm font-semibold text-white">Mergi la dashboard</a>
          </>
        )}
      </div>
    </div>
  );
}
