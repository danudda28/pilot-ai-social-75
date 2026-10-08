import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { NewsletterForm } from "@/components/NewsletterForm";
import { BOTS } from "@/lib/ai-team";
import { BOT_IMAGES } from "@/lib/bot-images";
import {
  Sparkles, Calendar, Hash, Video, Send, BarChart3, Clock, Brain,
  UserPlus, Plug, Target, Wand2, ArrowRight, Check,
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

function Home() {


  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />
        <div className="absolute -z-10 -top-32 -left-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div className="absolute -z-10 top-20 -right-24 h-96 w-96 rounded-full bg-accent/40 blur-3xl animate-blob" style={{ animationDelay: "-6s" }} />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6 animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> 8 angajați AI pentru afacerea ta din România
          </div>
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] animate-fade-in">
            Echipa ta de <span className="gradient-text">angajați AI</span>,<br className="hidden sm:block" /> care lucrează non-stop.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground animate-fade-in">
            Postări, texte, răspunsuri la clienți, leaduri și strategie — fiecare robot e specialist pe treaba lui și cunoaște afacerea ta.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-full gradient-bg glow px-8 py-4 text-base font-semibold text-primary-foreground transition-transform hover:scale-105">
              Angajează-i gratuit 30 de zile <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/preturi" className="inline-flex items-center justify-center rounded-full glass-strong px-8 py-4 text-base font-semibold">
              Vezi abonamentele
            </Link>
          </div>
          <div className="mt-14 flex justify-center items-end -space-x-6 sm:-space-x-10">
            {BOTS.slice(0, 5).map((b, i) => (
              <img key={b.id} src={BOT_IMAGES[b.id]} alt={`${b.name}, ${b.role}`} width={1024} height={1024}
                className="w-24 sm:w-40 lg:w-48 drop-shadow-2xl animate-float"
                style={{ animationDelay: `${i * -0.8}s`, zIndex: i === 2 ? 10 : 5 - Math.abs(2 - i), transform: i === 2 ? "scale(1.15)" : undefined }} />
            ))}
          </div>
        </div>
      </section>

      {/* ROBOTS MARQUEE */}
      <section className="py-20 overflow-hidden">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold">Cunoaște-ți <span className="gradient-text">echipa</span></h2>
          <p className="mt-4 text-muted-foreground">Fiecare robot are specialitatea lui. Alegi cu cine vorbești, ei se ocupă de restul.</p>
        </div>
        <div className="mt-14 relative [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
          <div className="flex w-max gap-6 animate-marquee hover:[animation-play-state:paused]">
            {[...BOTS, ...BOTS].map((b, i) => (
              <div key={i} className={`bot-card w-64 shrink-0 bg-gradient-to-br ${b.color}`}>
                <img src={BOT_IMAGES[b.id]} alt={b.name} loading="lazy" width={1024} height={1024} className="h-56 w-full object-contain pt-4" />
                <div className="p-5 pt-2">
                  <div className="font-display text-xl font-bold">{b.name}</div>
                  <div className="text-sm font-medium text-primary">{b.role}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{b.tagline}</p>
                </div>
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
          <p className="mt-6 text-muted-foreground">Începe cu 30 de zile gratuit. Fără card, fără bătaie de cap.</p>
          <Link to="/auth" className="mt-8 inline-flex items-center gap-2 rounded-xl gradient-bg glow px-8 py-4 text-base font-semibold text-white card-hover">
            Începe acum <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
