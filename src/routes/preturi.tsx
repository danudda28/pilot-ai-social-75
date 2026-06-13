import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/preturi")({
  head: () => ({
    meta: [
      { title: "Prețuri — Social Spark" },
      { name: "description", content: "Alege planul potrivit afacerii tale: Basic 20€, Pro 45€, Business 60€ pe lună." },
      { property: "og:title", content: "Prețuri — Social Spark" },
      { property: "og:description", content: "3 abonamente clare pentru orice tip de afacere." },
    ],
  }),
  component: Pricing,
});

const plans = [
  {
    id: "basic", name: "Basic", price: "20€", featured: false,
    features: [
      "12 postări generate lunar",
      "Texte pentru Instagram și Facebook",
      "Hashtaguri recomandate",
      "Idei de postări",
      "Calendar editorial basic",
      "Newsletter cu noutăți și promoții",
    ],
    cta: "Alege Basic",
  },
  {
    id: "pro", name: "Pro", price: "45€", featured: true,
    features: [
      "30 postări generate lunar",
      "Postări statice cu design AI",
      "Idei de Reels și video",
      "Programare automată prin API",
      "Analiză profil Instagram/Facebook",
      "Recomandări de creștere",
      "Calendar editorial complet",
      "Newsletter cu noutăți și promoții",
    ],
    cta: "Alege Pro",
  },
  {
    id: "business", name: "Business", price: "60€", featured: false,
    features: [
      "90 postări generate lunar",
      "Mai multe branduri / pagini",
      "Video scripts pentru Reels",
      "Automatizare completă postări",
      "Rapoarte de performanță",
      "Recomandări AI personalizate",
      "Prioritate suport",
      "Funcții avansate API publishing",
    ],
    cta: "Alege Business",
  },
];

function Pricing() {
  const navigate = useNavigate();

  async function choose(planId: string) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      toast.info("Înregistrează-te pentru a alege un plan.");
      navigate({ to: "/auth" });
      return;
    }
    // Stripe placeholder — to be wired with enable_stripe_payments
    toast.info(`Plan ${planId} selectat. Stripe checkout va fi disponibil în curând.`);
  }

  return (
    <PublicLayout>
      <section className="pt-20 pb-10 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="font-display text-4xl sm:text-6xl font-bold">
            Prețuri simple, <span className="gradient-text">rezultate reale</span>
          </h1>
          <p className="mt-6 text-muted-foreground">
            Alege planul care se potrivește ritmului afacerii tale. Anulezi oricând.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-6 lg:grid-cols-3">
          {plans.map(p => (
            <div key={p.id}
              className={`relative rounded-3xl p-8 card-hover flex flex-col ${p.featured ? "glass-strong border-primary/40 glow" : "glass"}`}>
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 gradient-bg rounded-full px-4 py-1 text-xs font-semibold text-white">
                  <Sparkles className="h-3 w-3" /> Cel mai popular
                </div>
              )}
              <h3 className="font-display text-2xl font-bold">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold">{p.price}</span>
                <span className="text-muted-foreground">/lună</span>
              </div>
              <ul className="mt-8 space-y-3 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => choose(p.id)}
                className={`mt-8 w-full rounded-xl px-5 py-3.5 text-sm font-semibold transition ${p.featured ? "gradient-bg glow text-white" : "glass-strong hover:bg-secondary"}`}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground max-w-xl mx-auto">
          Plățile se procesează securizat. Poți anula sau schimba planul oricând din dashboard.
        </p>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center">
            Întrebări <span className="gradient-text">frecvente</span>
          </h2>
          <div className="mt-12 space-y-4">
            {faqs.map((f, i) => (
              <details key={i} className="group glass rounded-2xl p-6 cursor-pointer">
                <summary className="font-semibold list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-primary text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

const faqs = [
  { q: "Pot anula oricând?", a: "Da. Anulezi din dashboard în orice moment, fără penalități. Păstrezi accesul până la sfârșitul perioadei plătite." },
  { q: "Ce se întâmplă dacă depășesc numărul de postări?", a: "Te anunțăm înainte și îți propunem un upgrade la planul superior. Poți face upgrade oricând și plătești doar diferența pe luna în curs." },
  { q: "AI-ul scrie cu adevărat în română?", a: "Da, cu diacritice și ton natural pentru România. Modelele folosite (Gemini 2.5) sunt antrenate pe corpusuri mari de text românesc." },
  { q: "Pot conecta mai multe pagini Instagram/Facebook?", a: "În planul Business poți conecta mai multe branduri și pagini. Basic și Pro permit un singur business." },
  { q: "Postările se publică automat?", a: "Da. După ce conectezi Instagram/Facebook prin Meta, programezi data și ora, iar sistemul publică în locul tău." },
  { q: "Există perioadă de probă?", a: "Da. Planul Free îți oferă 3 postări lunar, ca să testezi platforma fără card." },
  { q: "Cum funcționează facturarea?", a: "Facturare lunară, cu factură fiscală emisă pe firma sau persoana ta. TVA inclus pentru clienți din UE." },
];
