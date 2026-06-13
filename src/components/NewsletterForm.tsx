import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email("Email invalid").max(255),
  gdpr: z.boolean().refine(v => v, "Trebuie să accepți pentru a te abona"),
});

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, gdpr });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email, gdpr_accepted: gdpr });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.error("Acest email este deja abonat.");
      else toast.error("A apărut o eroare. Reîncearcă.");
      return;
    }
    toast.success("Te-ai abonat cu succes!");
    setEmail(""); setGdpr(false);
  }

  return (
    <form onSubmit={submit} className="glass-strong rounded-2xl p-6 md:p-8">
      <h3 className="font-display text-2xl font-bold">Primește noutăți și promoții</h3>
      <p className="mt-2 text-sm text-muted-foreground">Sfaturi de social media, funcții noi și oferte exclusive.</p>
      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="adresa@email.ro" required
          className="flex-1 rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
        <button type="submit" disabled={loading}
          className="rounded-lg gradient-bg glow px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? "Se trimite..." : "Abonează-mă"}
        </button>
      </div>
      <label className="mt-4 flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
        <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)} className="mt-0.5" />
        Sunt de acord să primesc noutăți și promoții despre AdPilot Social.
      </label>
    </form>
  );
}
