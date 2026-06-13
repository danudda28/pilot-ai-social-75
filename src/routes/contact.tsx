import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — AdPilot Social" },
      { name: "description", content: "Contactează-ne pentru o demonstrație sau întrebări. Telefon 0784227844, email bogdansergiu.arghir@gmail.com." },
      { property: "og:title", content: "Contact — AdPilot Social" },
      { property: "og:description", content: "Vorbește cu noi despre automatizarea social media." },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(2, "Numele e obligatoriu").max(100),
  email: z.string().trim().email("Email invalid").max(255),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().min(5, "Mesaj prea scurt").max(2000),
});

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert(parsed.data);
    setLoading(false);
    if (error) { toast.error("Nu s-a putut trimite. Reîncearcă."); return; }
    toast.success("Mesaj trimis! Te contactăm în curând.");
    setForm({ name: "", email: "", phone: "", message: "" });
  }

  return (
    <PublicLayout>
      <section className="pt-20 pb-10">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="font-display text-4xl sm:text-6xl font-bold">
            Hai să <span className="gradient-text">discutăm</span>
          </h1>
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">
            Vrei să vezi cum poate AdPilot Social să îți automatizeze prezența online? Contactează-ne și îți arătăm cum poți economisi timp, bani și energie în fiecare lună.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4">
            <a href="tel:0784227844" className="glass rounded-2xl p-6 card-hover block">
              <Phone className="h-6 w-6 text-primary mb-3" />
              <div className="text-xs text-muted-foreground">Telefon</div>
              <div className="font-semibold">0784 227 844</div>
            </a>
            <a href="mailto:bogdansergiu.arghir@gmail.com" className="glass rounded-2xl p-6 card-hover block">
              <Mail className="h-6 w-6 text-primary mb-3" />
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="font-semibold break-all">bogdansergiu.arghir@gmail.com</div>
            </a>
            <div className="glass rounded-2xl p-6">
              <MessageCircle className="h-6 w-6 text-primary mb-3" />
              <div className="text-xs text-muted-foreground">Răspuns</div>
              <div className="font-semibold">În maxim 24h</div>
            </div>
          </div>

          <form onSubmit={submit} className="lg:col-span-2 glass-strong rounded-2xl p-8 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nume" v={form.name} on={(v) => setForm({...form, name: v})} />
              <Field label="Email" type="email" v={form.email} on={(v) => setForm({...form, email: v})} />
            </div>
            <Field label="Telefon (opțional)" v={form.phone} on={(v) => setForm({...form, phone: v})} />
            <div>
              <label className="text-xs font-medium text-muted-foreground">Mesaj</label>
              <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} rows={6} required
                className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
            </div>
            <button disabled={loading} className="w-full rounded-xl gradient-bg glow px-6 py-3.5 text-sm font-semibold text-white disabled:opacity-50">
              {loading ? "Se trimite..." : "Trimite mesaj"}
            </button>
          </form>
        </div>
      </section>
    </PublicLayout>
  );
}

function Field({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input type={type} value={v} onChange={e => on(e.target.value)}
        className="mt-1.5 w-full rounded-lg bg-input/50 border border-border px-4 py-3 text-sm outline-none focus:border-primary" />
    </div>
  );
}
