import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { Check, Sparkles, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/preturi")({
  head: () => ({
    meta: [
      { title: "Abonamente — Social Spark" },
      { name: "description", content: "Alege abonamentul potrivit afacerii tale: Basic 99 lei, Pro 225 lei, Business 299 lei pe lună. 30 zile gratuit, anulezi oricând." },
      { property: "og:title", content: "Abonamente — Social Spark" },
      { property: "og:description", content: "3 abonamente clare, 30 zile gratis pe fiecare. Anulezi oricând în perioada de probă." },
    ],
  }),
  component: Pricing,
});

const plans = [
  {
    id: "basic", name: "Basic", price: "99 lei", featured: false,
    tagline: "Perfect dacă ești la început și vrei să fii activ pe rețele fără bătăi de cap.",
    description:
      "Îți scriem noi 12 postări pe lună (texte + hashtaguri) pentru Instagram și Facebook. Tu doar le copiezi și le postezi, sau le programezi din calendar. Ideal pentru micii antreprenori, freelanceri și afaceri locale care vor să apară constant online, dar nu au timp să se gândească zilnic ce să scrie.",
    features: [
      "12 postări gata scrise în fiecare lună",
      "Texte pentru Instagram și Facebook",
      "Hashtaguri alese automat ca să fii găsit mai ușor",
      "Idei de postări când nu ai inspirație",
      "Calendar simplu cu ce ai de postat",
      "Newsletter cu noutăți și promoții",
    ],
    cta: "Începe gratis 30 zile",
  },
  {
    id: "pro", name: "Pro", price: "225 lei", featured: true,
    tagline: "Cel mai ales plan. Pentru afaceri care vor să crească serios pe Instagram și Facebook.",
    description:
      "Primești 30 de postări lunar — text + design grafic generat de AI + idei de Reels. Postările se publică automat la ora pe care o alegi tu, fără să mai intri manual pe telefon. În plus, AI-ul îți analizează pagina și îți spune ce să schimbi ca să ai mai mulți followeri și mai multă interacțiune. Recomandat pentru saloane, restaurante, cabinete, magazine online și freelanceri activi.",
    features: [
      "30 postări gata făcute lunar",
      "Imagini pentru postări create cu AI",
      "Idei de Reels și video scurt",
      "Postare automată la ora aleasă de tine",
      "Analiză a paginii tale de Instagram/Facebook",
      "Sfaturi clare ca să crești numărul de urmăritori",
      "Calendar complet cu toate postările",
      "Newsletter cu noutăți și promoții",
    ],
    cta: "Începe gratis 30 zile",
  },
  {
    id: "business", name: "Business", price: "299 lei", featured: false,
    tagline: "Pentru agenții, firme cu mai multe locații sau brand-uri și antreprenori serioși.",
    description:
      "90 de postări pe lună și posibilitatea de a gestiona mai multe pagini sau brand-uri din același cont (perfect dacă ai mai multe afaceri sau ești agenție de marketing). Pe lângă postări și design, primești scripturi gata scrise pentru Reels, rapoarte lunare cu rezultatele tale și recomandări personalizate de la AI. Suport prioritar — îți răspundem primii când ai o întrebare.",
    features: [
      "90 postări gata făcute lunar",
      "Mai multe pagini / brand-uri în același cont",
      "Scripturi pentru Reels (ce să spui în video)",
      "Totul postat automat, fără efort din partea ta",
      "Rapoarte lunare cu ce a mers cel mai bine",
      "Recomandări AI personalizate pe afacerea ta",
      "Suport prioritar (răspundem primii)",
      "Funcții avansate de programare și publicare",
    ],
    cta: "Începe gratis 30 zile",
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
    toast.info(`Plan ${planId} selectat — primești 7 zile gratuite, fără plată acum. Stripe checkout va fi disponibil în curând.`);
  }

  return (
    <PublicLayout>
      <section className="pt-20 pb-10 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <h1 className="font-display text-4xl sm:text-6xl font-bold">
            Abonamente simple, <span className="gradient-text">rezultate reale</span>
          </h1>
          <p className="mt-6 text-muted-foreground">
            Toate abonamentele includ <strong className="text-foreground">7 zile gratuite</strong> de probă. Fără card cerut acum, anulezi oricând în cele 7 zile fără să plătești nimic.
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
              <div className="mt-3 inline-flex items-center gap-2 self-start rounded-full bg-primary/15 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary">
                <Gift className="h-3.5 w-3.5" /> 7 zile gratis · anulezi oricând
              </div>
              <p className="mt-3 text-sm font-medium text-foreground/90">{p.tagline}</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{p.description}</p>
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
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Fără plată în primele 7 zile. Anulezi oricând din dashboard.
              </p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-xs text-muted-foreground max-w-xl mx-auto">
          Plățile se procesează securizat după perioada de probă. Poți anula sau schimba abonamentul oricând din dashboard, fără penalități.
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
  { q: "Pot anula oricând?", a: "Da. Anulezi din dashboard în orice moment, fără penalități. În cele 7 zile de probă nu se reține nimic de pe card. După perioada de probă, păstrezi accesul până la sfârșitul lunii plătite." },
  { q: "Cum funcționează cele 7 zile gratuite?", a: "La fiecare abonament primești 7 zile complet gratuite cu acces total la toate funcțiile. Dacă anulezi în cele 7 zile, nu se reține nimic. Dacă păstrezi abonamentul, plata se face automat în ziua a 8-a." },
  { q: "Ce se întâmplă dacă depășesc numărul de postări?", a: "Te anunțăm înainte și îți propunem un upgrade la planul superior. Poți face upgrade oricând și plătești doar diferența pe luna în curs." },
  { q: "AI-ul scrie cu adevărat în română?", a: "Da, cu diacritice și ton natural pentru România. Modelele folosite (Gemini 2.5) sunt antrenate pe corpusuri mari de text românesc." },
  { q: "Pot conecta mai multe pagini Instagram/Facebook?", a: "În planul Business poți conecta mai multe branduri și pagini. Basic și Pro permit un singur business." },
  { q: "Postările se publică automat?", a: "Da. După ce conectezi Instagram/Facebook prin Meta, programezi data și ora, iar sistemul publică în locul tău." },
  { q: "Există perioadă de probă?", a: "Da, fiecare abonament include 7 zile gratuite cu acces complet. În plus, planul Free îți oferă 3 postări lunar fără card, dacă vrei doar să încerci platforma." },
  { q: "Cum funcționează facturarea?", a: "Facturare lunară, cu factură fiscală emisă pe firma sau persoana ta. TVA inclus pentru clienți din UE." },
];
