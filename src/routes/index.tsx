import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/PublicLayout";
import { NewsletterForm } from "@/components/NewsletterForm";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles, Calendar, Hash, Video, Send, BarChart3, Clock, Brain,
  UserPlus, Plug, Target, Wand2, ArrowRight, Check, Star,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Social Spark — Postări AI pentru Instagram și Facebook" },
      { name: "description", content: "Generează, programează și publică postări AI pentru Instagram și Facebook. Fără agenție, fără idei blocate." },
      { property: "og:title", content: "Social Spark — Postări AI pentru Instagram și Facebook" },
      { property: "og:description", content: "Postările afacerii tale, create automat cu AI." },
    ],
  }),
  component: Home,
});

const benefits = [
  { icon: Brain, title: "AI care înțelege domeniul tău", desc: "Răspunsuri adaptate la salon, restaurant, clinică, magazin sau orice afacere." },
  { icon: Sparkles, title: "Postări generate automat", desc: "Conținut original, coerent și pe brand, fără efort." },
  { icon: Send, title: "Texte persuasive", desc: "Copywriting care vinde, atrage și menține atenția." },
  { icon: Video, title: "Idei de Reels și video", desc: "Scenarii și concepte gata de filmat." },
  { icon: Calendar, title: "Programare automată", desc: "Postările pleacă singure la ora și ziua potrivită." },
  { icon: Hash, title: "Hashtaguri inteligente", desc: "Recomandări care cresc reach-ul organic." },
  { icon: BarChart3, title: "Recomandări de creștere", desc: "Sugestii AI pentru engagement și followeri." },
  { icon: Clock, title: "Economie de timp și bani", desc: "Cât 10 ore de social media manager pe lună." },
];

const steps = [
  { n: "01", icon: UserPlus, title: "Îți creezi contul", desc: "Înregistrare rapidă, fără cardul de credit." },
  { n: "02", icon: Plug, title: "Conectezi Instagram/Facebook", desc: "Integrare oficială prin API de publishing." },
  { n: "03", icon: Target, title: "Alegi domeniul de activitate", desc: "AI-ul învață vocea și obiectivele brandului tău." },
  { n: "04", icon: Wand2, title: "AI-ul generează și programează", desc: "Postări, hashtaguri, idei de video și calendar editorial." },
];

const faqs = [
  { q: "Trebuie să am cunoștințe tehnice?", a: "Nu. Social Spark e gândit pentru antreprenori, nu pentru specialiști IT. Te înregistrezi, conectezi paginile și AI-ul se ocupă de restul." },
  { q: "Pot edita postările înainte să fie publicate?", a: "Da, fiecare postare trece prin starea „draft” unde o poți edita, aproba sau respinge." },
  { q: "Pot anula abonamentul oricând?", a: "Da, fără penalități. Te abonezi și dezabonezi când vrei, direct din dashboard." },
  { q: "Conținutul este unic?", a: "Da. AI-ul generează texte originale, adaptate brandului și domeniului tău." },
];

const fallbackTestimonials = [
  { author_name: "Andreea M.", author_role: "Salon de înfrumusețare", content: "Am 3 postări pe săptămână fără să mai stau să mă gândesc ce să scriu. Clientele mă întreabă constant cine îmi face conținutul.", rating: 5, avatar_url: null },
  { author_name: "Mihai V.", author_role: "Restaurant", content: "Reels-urile generate aici mi-au dublat rezervările pe weekend. Cea mai bună investiție în marketing.", rating: 5, avatar_url: null },
  { author_name: "Cristian D.", author_role: "Service auto", content: "Nu credeam că AI-ul poate suna ca brandul meu. M-a surprins. Postările sunt directe și convertesc.", rating: 5, avatar_url: null },
];

function Home() {
  const [testimonials, setTestimonials] = useState(fallbackTestimonials);

  useEffect(() => {
    supabase.from("testimonials")
      .select("author_name,author_role,content,rating,avatar_url")
      .eq("published", true)
      .order("display_order")
      .limit(6)
      .then(({ data }) => { if (data && data.length > 0) setTestimonials(data as any); });
  }, []);

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden pt-20 pb-28 sm:pt-28 sm:pb-36">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Powered by Lovable AI
          </div>
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] animate-fade-in">
            Postările afacerii tale, <br className="hidden sm:block" />
            <span className="gradient-text">create automat cu AI.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground animate-fade-in">
            Social Spark te ajută să creezi, programezi și publici postări pentru Instagram și Facebook fără să pierzi timp, fără agenție și fără idei blocate.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-xl gradient-bg glow px-8 py-4 text-base font-semibold text-white card-hover">
              Începe acum <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/preturi" className="inline-flex items-center justify-center rounded-xl glass-strong px-8 py-4 text-base font-semibold">
              Vezi abonamentele
            </Link>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-2xl mx-auto text-center">
            {[["1.000+", "Postări generate"], ["98%", "Clienți mulțumiți"], ["10h", "Economisite/lună"]].map(([n, l]) => (
              <div key={l} className="glass rounded-xl p-4">
                <div className="font-display text-2xl font-bold gradient-text">{n}</div>
                <div className="text-xs text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">Tot ce ai nevoie pentru social media</h2>
            <p className="mt-4 text-muted-foreground">Funcții gândite pentru afaceri reale, nu pentru agenții.</p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(b => (
              <div key={b.title} className="glass rounded-2xl p-6 card-hover">
                <div className="grid h-11 w-11 place-items-center rounded-xl gradient-bg mb-4">
                  <b.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">Cum funcționează</h2>
            <p className="mt-4 text-muted-foreground">De la cont la prima postare, în mai puțin de 5 minute.</p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(s => (
              <div key={s.n} className="relative glass-strong rounded-2xl p-6 card-hover">
                <div className="absolute -top-3 -right-3 grid h-12 w-12 place-items-center rounded-xl gradient-bg glow font-display font-bold text-white">{s.n}</div>
                <s.icon className="h-7 w-7 text-primary mb-4" />
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold">Antreprenori care folosesc deja Social Spark</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {testimonials.map(t => (
              <div key={t.name} className="glass rounded-2xl p-6 card-hover">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-primary text-primary" />)}
                </div>
                <p className="text-sm">"{t.quote}"</p>
                <div className="mt-4 pt-4 border-t border-border/50">
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="py-10">
        <div className="mx-auto max-w-5xl px-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {["GDPR Compliant", "Plăți Stripe sigure", "Suport în română", "AI premium"].map(b => (
            <div key={b} className="glass rounded-xl p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Check className="h-4 w-4 text-primary" /> {b}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center">Întrebări frecvente</h2>
          <div className="mt-10 space-y-3">
            {faqs.map(f => (
              <details key={f.q} className="glass rounded-xl p-5 group">
                <summary className="font-semibold cursor-pointer flex justify-between items-center">
                  {f.q}
                  <ArrowRight className="h-4 w-4 group-open:rotate-90 transition-transform" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4">
          <NewsletterForm />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-4 text-center glass-strong rounded-3xl p-10 sm:p-16 glow">
          <h2 className="font-display text-3xl sm:text-5xl font-bold">
            Lasă <span className="gradient-text">AI-ul</span> să lucreze<br />
            pentru social media-ul afacerii tale.
          </h2>
          <p className="mt-6 text-muted-foreground">Începe cu 3 postări gratuite. Fără card, fără bătaie de cap.</p>
          <Link to="/auth" className="mt-8 inline-flex items-center gap-2 rounded-xl gradient-bg glow px-8 py-4 text-base font-semibold text-white card-hover">
            Începe acum <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
