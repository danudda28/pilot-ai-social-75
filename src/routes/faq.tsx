import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { FaqList } from "@/components/marketing/FaqList";
import { Eyebrow, Reveal } from "@/components/marketing/Reveal";
import { FAQS } from "@/lib/marketing";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Întrebări frecvente — Social Spark" },
      { name: "description", content: "Cum funcționează creditele, ce se întâmplă când se termină, cum anulezi și ce primești înainte să plătești." },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden pb-24 pt-16 sm:pt-24">
        <div className="m-hero-glow opacity-50" />
        <div className="m-container relative z-10 max-w-3xl">
          <Reveal>
            <Eyebrow>FAQ</Eyebrow>
            <h1 className="mt-5 text-5xl leading-[1.05] tracking-[-0.045em] sm:text-6xl">
              Întrebări & răspunsuri
            </h1>
            <p className="mt-6 text-white/50">
              Dacă e despre un cont anume, <Link to="/contact" className="text-white underline underline-offset-4">scrie-ne</Link>.
            </p>
          </Reveal>
          <div className="mt-12">
            <FaqList groups={FAQS} />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
