import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eyebrow, Reveal } from "@/components/marketing/Reveal";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Social Spark" },
      { name: "description", content: "Contactează-ne pentru o demonstrație sau întrebări. Telefon 0784227844." },
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
      <section className="relative overflow-hidden pb-24 pt-16 sm:pt-24">
        <div className="m-hero-glow opacity-50" />
        <div className="m-container relative z-10">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>Contact</Eyebrow>
            <h1 className="mt-5 text-5xl tracking-[-0.045em] sm:text-6xl">Hai să discutăm.</h1>
            <p className="mt-6 text-white/50">
              Vrei o demonstrație sau ai o întrebare? Îți răspundem în maxim 24h.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            <Reveal className="space-y-3">
              <a href="tel:0784227844" className="m-panel block p-5 transition hover:border-white/20">
                <Phone className="mb-3 h-5 w-5 text-[var(--m-accent)]" />
                <p className="text-[12px] text-white/40">Telefon</p>
                <p className="mt-1 text-white">0784 227 844</p>
              </a>
              <a href="mailto:bogdansergiu.arghir@gmail.com" className="m-panel block p-5 transition hover:border-white/20">
                <Mail className="mb-3 h-5 w-5 text-[var(--m-accent)]" />
                <p className="text-[12px] text-white/40">Email</p>
                <p className="mt-1 break-all text-white">bogdansergiu.arghir@gmail.com</p>
              </a>
              <div className="m-panel p-5">
                <MessageCircle className="mb-3 h-5 w-5 text-[var(--m-accent)]" />
                <p className="text-[12px] text-white/40">Răspuns</p>
                <p className="mt-1 text-white">În maxim 24h</p>
              </div>
            </Reveal>

            <Reveal delay={0.08} className="lg:col-span-2">
              <form onSubmit={submit} className="m-panel space-y-4 p-6 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nume" v={form.name} on={(v) => setForm({ ...form, name: v })} />
                  <Field label="Email" type="email" v={form.email} on={(v) => setForm({ ...form, email: v })} />
                </div>
                <Field label="Telefon (opțional)" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />
                <div>
                  <label className="text-xs text-white/40">Mesaj</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                    rows={5}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[var(--m-accent)]"
                  />
                </div>
                <button disabled={loading} className="m-pill m-pill-solid text-sm disabled:opacity-50">
                  {loading ? "Se trimite..." : "Trimite mesajul"}
                </button>
              </form>
            </Reveal>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function Field({
  label,
  v,
  on,
  type = "text",
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-white/40">{label}</label>
      <input
        type={type}
        value={v}
        onChange={(e) => on(e.target.value)}
        required={type === "email" || label === "Nume"}
        className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[var(--m-accent)]"
      />
    </div>
  );
}
