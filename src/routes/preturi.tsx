import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { PlanBoard } from "@/components/marketing/PlanBoard";
import { FaqList } from "@/components/marketing/FaqList";
import { Eyebrow, Reveal } from "@/components/marketing/Reveal";
import { FAQS } from "@/lib/marketing";

export const Route = createFileRoute("/preturi")({
  head: () => ({
    meta: [
      { title: "Prețuri — Social Spark" },
      { name: "description", content: "Cinci planuri, de la Debut la Agenție. Anualul costă jumătate. Un reel e 100 de credite, o imagine e 10." },
      { property: "og:title", content: "Prețuri — Social Spark" },
      { property: "og:description", content: "Credite clare, facturare anuală la jumătate, rambursare dacă nu ai folosit nimic." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden pb-8 pt-16 sm:pt-24">
        <div className="m-hero-glow opacity-60" />
        <div className="m-container relative z-10 text-center">
          <Reveal>
            <Eyebrow>Prețuri</Eyebrow>
            <h1 className="mx-auto mt-5 max-w-3xl text-5xl leading-[1.05] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Prețuri simple.<br />Fără retainer.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50">
              Anualul e jumătate din prețul lunar, calculat exact. Creditele se reînnoiesc lunar.
              Dacă nu folosești niciunul într-o perioadă facturată, factura se întoarce.
            </p>
          </Reveal>
        </div>
        <div className="m-container relative z-10 mt-12">
          <PlanBoard />
        </div>
      </section>

      <section className="m-container grid gap-4 py-16 md:grid-cols-[1.2fr_0.8fr]">
        <Reveal>
          <div className="m-panel h-full p-8">
            <h2 className="text-4xl tracking-tight text-white">Pentru o organizație</h2>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-white/45">
              Peste douăsprezece branduri, facturare pe companie, arhitect de cont.
              Nu e un plan din listă — se taie după câte conturi chiar publică.
            </p>
            <Link to="/contact" className="m-pill m-pill-solid mt-6 inline-flex text-sm">Scrie echipei</Link>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="flex h-full flex-col justify-center gap-5 rounded-2xl border border-white/8 bg-white/[0.02] p-8 text-[14px] leading-relaxed text-white/55">
            <p>Upgrade-ul aduce creditele noi în aceeași zi. Plătești doar diferența rămasă.</p>
            <p>Downgrade-ul așteaptă factura următoare, ca să nu tai ce ai plătit deja.</p>
            <p>Anularea oprește reînnoirea. Accesul ține până la capătul perioadei.</p>
          </div>
        </Reveal>
      </section>

      <section className="m-container max-w-3xl pb-24">
        <FaqList groups={FAQS.filter((g) => g.group !== "Despre produs")} />
      </section>
    </PublicLayout>
  );
}
