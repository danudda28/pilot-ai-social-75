import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { Heart, Zap, Palette } from "lucide-react";

export const Route = createFileRoute("/despre")({
  head: () => ({
    meta: [
      { title: "Despre noi — Social Spark" },
      { name: "description", content: "Social Spark ajută antreprenorii să fie prezenți pe Instagram și Facebook fără efort, folosind AI." },
      { property: "og:title", content: "Despre noi — Social Spark" },
      { property: "og:description", content: "Construit pentru antreprenori care vor mai multă prezență online." },
    ],
  }),
  component: About,
});

const cards = [
  { icon: Heart, title: "Creat pentru afaceri reale", desc: "Nu pentru agenții, nu pentru influenceri. Pentru saloane, restaurante, clinici, magazine — afaceri care vor să crească." },
  { icon: Zap, title: "Automatizare simplă", desc: "Conectezi, alegi domeniul și AI-ul preia volanul. Tu doar aprobi sau editezi când e cazul." },
  { icon: Palette, title: "Conținut adaptat brandului", desc: "Vocea, tonul și obiectivele tale, transpuse în fiecare postare. Nu sună a robot." },
];

function About() {
  return (
    <PublicLayout>
      <section className="pt-20 pb-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl sm:text-6xl font-bold leading-tight">
            Construit pentru <span className="gradient-text">antreprenori</span>, nu pentru agenții.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Știm cât de greu e să fii prezent pe social media când conduci o afacere. Social Spark rezolvă asta.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="glass-strong rounded-2xl p-8 sm:p-12 space-y-5 text-base leading-relaxed">
            <p>
              <strong>Social Spark</strong> a fost creat pentru antreprenorii care știu că prezența online contează, dar nu au timp să stea zilnic să gândească postări, texte, idei și campanii. Aplicația noastră folosește inteligența artificială pentru a transforma orice afacere într-un brand activ, coerent și profesionist pe social media.
            </p>
            <p>
              Fie că ai un salon, restaurant, clinică, service auto, magazin online, firmă de construcții sau orice alt tip de business, Social Spark te ajută să comunici mai clar, mai des și mai convingător cu publicul tău.
            </p>
            <p>
              Nu înlocuim creativitatea umană, ci eliminăm blocajele, lipsa de timp și haosul din postări. <span className="gradient-text font-semibold">Tu te ocupi de afacere, iar AI-ul nostru te ajută să fii prezent constant online.</span>
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 grid gap-6 md:grid-cols-3">
          {cards.map(c => (
            <div key={c.title} className="glass rounded-2xl p-7 card-hover">
              <div className="grid h-12 w-12 place-items-center rounded-xl gradient-bg mb-5">
                <c.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg">{c.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
