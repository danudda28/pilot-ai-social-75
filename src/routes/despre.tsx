import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { Eyebrow, Reveal } from "@/components/marketing/Reveal";

export const Route = createFileRoute("/despre")({
  head: () => ({
    meta: [
      { title: "Despre noi — Social Spark" },
      { name: "description", content: "Social Spark ajută antreprenorii să fie prezenți pe Instagram și Facebook fără efort, folosind AI." },
    ],
  }),
  component: About,
});

const cards = [
  { title: "Creat pentru afaceri reale", desc: "Nu pentru agenții, nu pentru influenceri. Pentru saloane, restaurante, clinici, magazine." },
  { title: "Automatizare simplă", desc: "Conectezi, descrii afacerea, aprobi. AI-ul ține ritmul săptămânii." },
  { title: "Conținut pe vocea ta", desc: "Brand Brain ține tonul. Fiecare postare trece prin regulile confirmate de tine." },
];

function About() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden pb-24 pt-16 sm:pt-24">
        <div className="m-hero-glow opacity-50" />
        <div className="m-container relative z-10">
          <Reveal className="mx-auto max-w-3xl text-center">
            <Eyebrow>Despre</Eyebrow>
            <h1 className="mt-5 text-5xl leading-[1.05] tracking-[-0.045em] sm:text-6xl">
              Construit pentru antreprenori,<br className="hidden sm:block" /> nu pentru agenții.
            </h1>
            <p className="mt-6 text-lg text-white/50">
              Știm cât de greu e să fii prezent pe social media când conduci o afacere. Social Spark rezolvă asta.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="m-panel mx-auto mt-12 max-w-3xl space-y-5 p-8 text-[16px] leading-relaxed text-white/60 sm:p-12">
            <p>
              Social Spark a fost creat pentru antreprenorii care știu că prezența online contează, dar nu au timp să stea zilnic să gândească postări, texte, idei și campanii.
            </p>
            <p>
              Folosim inteligența artificială ca să transformăm orice afacere într-un brand activ, coerent și profesionist pe social media — fără să inventăm fapte. Tot ce publică AI-ul pornește din Brand Brain confirmat de tine.
            </p>
            <p>
              Nu înlocuim creativitatea umană. Eliminăm blocajele, lipsa de timp și haosul din postări. Tu te ocupi de afacere. Noi ținem feed-ul viu.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-3 md:grid-cols-3">
            {cards.map((c, i) => (
              <Reveal key={c.title} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-white/8 bg-white/[0.02] p-6">
                  <h2 className="text-2xl tracking-tight text-white">{c.title}</h2>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/45">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 text-center">
            <Link to="/auth" className="m-pill m-pill-solid inline-flex text-sm">Începe acum</Link>
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}
