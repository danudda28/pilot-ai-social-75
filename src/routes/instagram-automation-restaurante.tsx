import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { UtensilsCrossed, Sparkles, ArrowRight, Check, Calendar, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/instagram-automation-restaurante")({
  head: () => ({
    meta: [
      { title: "Automatizare Instagram pentru Restaurante — AdPilot Social" },
      { name: "description", content: "Postări AI zilnice pentru restaurantul tău: meniuri, oferte, evenimente. Programare automată Instagram și Facebook, fără agenție." },
      { property: "og:title", content: "Automatizare Instagram pentru Restaurante" },
      { property: "og:description", content: "AI care înțelege HoReCa. Generează și publică conținut zilnic, atrage rezervări." },
    ],
  }),
  component: Page,
});

const features = [
  "Postări zilnice cu meniul zilei și ofertele",
  "Fotografii AI ale preparatelor (când n-ai timp de food photographer)",
  "Hashtaguri locale optimizate per oraș (Cluj, București, Iași...)",
  "Programare automată în orele de vârf (12:00, 18:30)",
  "Reels-uri pe trenduri Instagram, adaptate pentru bucătăria ta",
  "Răspunsuri AI la comentarii și mesaje DM (în curând)",
];

const useCases = [
  { icon: UtensilsCrossed, title: "Meniul zilei", desc: "AI scrie copy apetisant pentru fiecare fel: ingrediente, story, preț. Tu doar dai upload la fotografie." },
  { icon: Calendar, title: "Evenimente & rezervări", desc: "Anunțuri pentru live music, Valentine's Day, Crăciun — generate cu 2 săptămâni înainte și programate." },
  { icon: BarChart3, title: "Insights reale", desc: "Vezi ce posturi atrag mai multe rezervări — copy, oră, hashtag — și AI învață ce funcționează." },
];

function Page() {
  return (
    <PublicLayout>
      <section className="pt-20 pb-16 sm:pt-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6">
            <UtensilsCrossed className="h-3.5 w-3.5 text-primary" /> Pentru HoReCa
          </div>
          <h1 className="font-display text-4xl sm:text-6xl font-bold leading-tight">
            Postări Instagram pentru <span className="gradient-text">restaurantul tău</span>, generate zilnic cu AI.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            AdPilot înțelege HoReCa: meniuri, oferte, evenimente, food trends. Generează conținut autentic, programează în ore de vârf, măsoară impactul în rezervări. <strong>Cât 8h de social media manager pe lună.</strong>
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link to="/auth" className="inline-flex items-center justify-center gap-2 rounded-xl gradient-bg glow px-8 py-4 font-semibold text-white">
              Începe gratuit <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/preturi" className="inline-flex items-center justify-center rounded-xl glass-strong px-8 py-4 font-semibold">
              Vezi prețuri
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-secondary/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold mb-10">Ce face AdPilot pentru un restaurant</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {useCases.map(u => (
              <div key={u.title} className="glass rounded-2xl p-6">
                <u.icon className="h-6 w-6 text-primary mb-4" />
                <div className="font-semibold mb-1">{u.title}</div>
                <p className="text-sm text-muted-foreground">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold mb-8">Tot ce primești</h2>
          <ul className="space-y-3">
            {features.map(f => (
              <li key={f} className="flex items-start gap-3 glass rounded-xl p-4">
                <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center glass-strong rounded-3xl p-10">
          <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="font-display text-3xl font-bold">Gata să umpli restaurantul fără efort?</h2>
          <p className="mt-3 text-muted-foreground">Începe în 2 minute. Card de credit doar la upgrade.</p>
          <Link to="/auth" className="mt-8 inline-flex items-center gap-2 rounded-xl gradient-bg glow px-8 py-4 font-semibold text-white">
            Creează cont gratuit <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
