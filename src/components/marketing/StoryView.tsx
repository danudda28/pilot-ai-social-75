import { Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { Composer } from "@/components/marketing/Composer";
import { DemoVisual } from "@/components/marketing/DemoVisual";
import { Eyebrow, Reveal } from "@/components/marketing/Reveal";
import type { Story } from "@/lib/marketing";
import { MARKETING_IMAGES } from "@/lib/marketing-images";

export function StoryView({ story }: { story: Story }) {
  const demo = story.demoImage ? MARKETING_IMAGES[story.demoImage] : null;

  return (
    <PublicLayout>
      <article className="relative overflow-hidden pb-24 pt-16 sm:pt-24">
        <div className="m-hero-glow opacity-70" />
        <div className="m-container relative z-10">
          <Reveal>
            <Eyebrow>{story.kicker}</Eyebrow>
            <h1 className="mt-5 max-w-3xl text-5xl leading-[1.05] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              {story.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/55">{story.lede}</p>
          </Reveal>

          <Reveal delay={0.1} className="mx-auto mt-12 max-w-2xl">
            <Composer compact />
          </Reveal>

          {demo && (
            <Reveal delay={0.14} className="mt-14">
              <DemoVisual image={demo} />
            </Reveal>
          )}

          <ol className="mt-24 grid gap-6 md:grid-cols-2">
            {story.steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.05}>
                <li className="h-full rounded-2xl border border-white/8 bg-white/[0.02] p-6">
                  <p className="text-[13px] text-[var(--m-accent)]">0{index + 1}</p>
                  <h2 className="mt-3 text-3xl tracking-tight text-white">{step.title}</h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/45">{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>

          <section className="mt-24">
            <Reveal>
              <h2 className="text-4xl tracking-tight text-white">Ce rămâne la tine</h2>
            </Reveal>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {story.outcomes.map((item, i) => (
                <Reveal key={item.title} delay={i * 0.05}>
                  <div className="m-panel h-full p-6">
                    <h3 className="text-2xl tracking-tight text-white">{item.title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-white/45">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-24 max-w-3xl">
            <Reveal>
              <h2 className="text-4xl tracking-tight text-white">Întrebări</h2>
            </Reveal>
            <div className="mt-6 divide-y divide-white/8 border-y border-white/8">
              {story.faqs.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] text-white">
                    {item.q}
                    <span className="text-white/35 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/45">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <Reveal className="mt-16 flex flex-wrap gap-4">
            <Link to="/preturi" className="m-pill m-pill-solid text-sm">Vezi planurile</Link>
            <Link to="/faq" className="m-pill m-pill-ghost text-sm">Toate întrebările</Link>
          </Reveal>
        </div>
      </article>
    </PublicLayout>
  );
}
