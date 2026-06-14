import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { Scissors, ArrowRight, Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/postari-ai-saloane")({
  head: () => ({
    meta: [
      { title: "Postări AI pentru Saloane de Înfrumusețare — AdPilot" },
      { name: "description", content: "Conținut Instagram zilnic pentru salonul tău: before/after, oferte, programări. Generat și publicat automat cu AI." },
      { property: "og:title", content: "Postări AI pentru Saloane" },
      { property: "og:description", content: "Mai puține mesaje pierdute, mai multe programări. AI care vorbește limbajul saloanelor." },
    ],
  }),
  component: Page,
});

const benefits = [
  "Postări before/after cu copy care convertesc",
  "Anunțuri de oferte (Black Friday, Crăciun, Mărțișor) generate automat",
  "Hashtaguri locale: #salonbucuresti, #freezericluj etc.",
  "Programare în orele de vârf (10:00, 17:00) când clientele scrollează",
  "Idei reels pe trenduri beauty + tutoriale rapide",
  "Răspuns automat la DM-uri cu link de programare (în curând)",
];

function Page() {
  return (
    <PublicLayout>
      <section className="pt-20 pb-16 sm:pt-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs mb-6">
            <Scissors className="h-3.5 w-3.5 text-primary" /> Pentru saloane & spa
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold leading-tight">
            Mai puține DM-uri pierdute, <span className="gradient-text">mai multe programări.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            AdPilot creează postările care fac clientele să te caute. Before/after, oferte, story-uri zilnice — totul programat și publicat automat. Tu te ocupi de clientă, AI-ul de marketing.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-xl gradient-bg glow px-8 py-4 font-semibold text-white">
              Încearcă gratuit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/preturi" className="inline-flex items-center justify-center rounded-xl glass-strong px-8 py-4 font-semibold">
              Vezi prețuri
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-secondary/20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold mb-8">Ce primești</h2>
          <ul className="space-y-3">
            {benefits.map(b => (
              <li key={b} className="flex items-start gap-3 glass rounded-xl p-4">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center glass-strong rounded-3xl p-10">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="font-display text-3xl font-bold">Începe gratuit. Vezi prima postare în 30 secunde.</h2>
          <Link to="/auth" className="mt-8 inline-flex items-center gap-2 rounded-xl gradient-bg glow px-8 py-4 font-semibold text-white">
            Creează cont <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
