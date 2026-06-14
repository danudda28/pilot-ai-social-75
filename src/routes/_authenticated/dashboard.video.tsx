import { createFileRoute } from "@tanstack/react-router";
import { Video, Sparkles, Bell } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/video")({
  head: () => ({ meta: [{ title: "AI Video & Reels — AdPilot" }] }),
  component: VideoPage,
});

function VideoPage() {
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  async function joinWaitlist() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { toast.error("Nu putem prelua emailul."); setLoading(false); return; }
    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: user.email, gdpr_accepted: true,
    });
    setLoading(false);
    if (error && !error.message.includes("duplicate")) { toast.error(error.message); return; }
    setJoined(true);
    toast.success("Ești pe listă! Te anunțăm primul.");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Video className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold">AI Video & Reels</h1>
          <p className="text-muted-foreground mt-1">Generare automată de scurte video pentru Instagram Reels și Facebook.</p>
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-accent" /> În curând
        </div>
        <h2 className="font-display text-2xl font-bold">Reels generate cu AI, voiceover inclus</h2>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          AI-ul va genera scenariul, va alege scenele B-roll, voiceover natural în limba română și editare automată sub 60 secunde — gata de publicat.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 mt-6">
          {["Scenariu + storyboard AI", "Voiceover RO natural", "Editare + subtitrări auto"].map(f => (
            <div key={f} className="glass rounded-xl p-4 text-xs text-muted-foreground">{f}</div>
          ))}
        </div>
        <div className="pt-4">
          <button
            onClick={joinWaitlist}
            disabled={loading || joined}
            className="inline-flex items-center gap-2 rounded-xl gradient-bg glow px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Bell className="h-4 w-4" />
            {joined ? "Ești pe listă ✓" : "Anunță-mă când e gata"}
          </button>
        </div>
      </div>
    </div>
  );
}
