import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Copy, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/referral")({
  head: () => ({ meta: [{ title: "Referral — Social Spark" }] }),
  component: ReferralPage,
});

function ReferralPage() {
  const [code, setCode] = useState<string>("");
  const [count, setCount] = useState(0);

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data: p } = await supabase.from("users_profiles").select("referral_code").eq("user_id", user.id).maybeSingle();
    setCode(p?.referral_code ?? "");
    const { count: c } = await supabase.from("referrals").select("*", { count: "exact", head: true }).eq("referrer_id", user.id);
    setCount(c ?? 0);
  })(); }, []);

  const link = typeof window !== "undefined" ? `${window.location.origin}/auth?ref=${code}` : "";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Gift className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">Recomandă & câștigă</h1>
          <p className="text-muted-foreground mt-1">Pentru fiecare prieten care se înscrie, primești 5 postări bonus.</p>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-6 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Codul tău</div>
          <div className="flex items-center gap-2">
            <input readOnly value={code} className="flex-1 font-mono text-2xl font-bold bg-input/50 border border-border rounded-lg px-4 py-3 outline-none" />
            <button onClick={() => { navigator.clipboard.writeText(code); toast.success("Cod copiat."); }}
              className="rounded-lg glass-strong px-3 py-3"><Copy className="h-4 w-4" /></button>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Link de invitație</div>
          <div className="flex items-center gap-2">
            <input readOnly value={link} className="flex-1 text-xs bg-input/50 border border-border rounded-lg px-3 py-2.5 outline-none" />
            <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiat."); }}
              className="rounded-lg glass-strong px-3 py-2.5"><Copy className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4 flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        <div>
          <div className="font-bold">{count} {count === 1 ? "prieten înscris" : "prieteni înscriși"}</div>
          <div className="text-xs text-muted-foreground">Bonus total: {count * 5} postări</div>
        </div>
      </div>
    </div>
  );
}
