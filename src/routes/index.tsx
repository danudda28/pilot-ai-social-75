import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, Star } from "lucide-react";
import { PublicLayout } from "@/components/PublicLayout";
import { Composer } from "@/components/marketing/Composer";
import { Eyebrow, Reveal } from "@/components/marketing/Reveal";
import { PRODUCTS, SOLUTIONS, FAQS } from "@/lib/marketing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Social Spark — AI care creează, programează și publică postările tale" },
      { name: "description", content: "Reels, postări și reclame pentru Instagram, Facebook și TikTok. Scrie un paragraf, vezi schița, publică într-un click." },
      { property: "og:title", content: "Social Spark — AI care creează, programează și publică postările tale" },
      { property: "og:description", content: "Nu mai aștepta o agenție. Generează, aprobi și publici din același loc." },
    ],
  }),
  component: Home,
});

const months = [
  {
    title: "Tu, singur",
    lines: ["3 postări pe lună", "Weekend pierdut pe Canva", "Zero ritm"],
    tone: "weak",
  },
  {
    title: "Freelancer",
    lines: ["8 postări pe lună", "Retainer 1.500 lei", "Aștepți o săptămână"],
    tone: "mid",
  },
  {
    title: "Agenție",
    lines: ["12 postări pe lună", "Retainer 3.000+ lei", "Briefuri, revizii, delay"],
    tone: "mid",
  },
  {
    title: "Social Spark",
    lines: ["Până la 20 reels / lună", "De la 45 lei / lună anual", "Aprobi din telefon"],
    tone: "win",
  },
];

const features = [
  {
    eyebrow: "Reels",
    title: "Video comercial din pozele tale",
    body: "Scenariu, voce în română, muzică și subtitrări. Fără filmare, fără studio.",
    slug: "video-fara-filmare",
    kind: "solutie" as const,
  },
  {
    eyebrow: "Manager",
    title: "Postează peste tot, automat",
    body: "Instagram, Facebook, TikTok. Un calendar, o voce, publicare la ora potrivită.",
    slug: "manager",
    kind: "produs" as const,
  },
  {
    eyebrow: "Reclame",
    title: "Clienți, nu doar vizualizări",
    body: "Promovezi o postare deja bună. Solicitările ajung în WhatsApp, cu detaliile.",
    slug: "reclame",
    kind: "produs" as const,
  },
  {
    eyebrow: "WhatsApp",
    title: "Aprobi din chat",
    body: "Primești varianta, răspunzi «publică» sau «schimbă prețul». Corectura nu costă credite.",
    slug: "whatsapp",
    kind: "produs" as const,
  },
];

const challenges = [
  { n: "01", problem: "Ore pierdute pe postări", solve: "Generezi un reel și o postare în câteva minute, din paragraful tău și pozele de pe telefon." },
  { n: "02", problem: "Voce de brand inconsistentă", solve: "Brand Brain ține tonul. Fiecare text trece prin aceleași reguli confirmate de tine." },
  { n: "03", problem: "Feed-ul moare după o săptămână", solve: "Pilotul automat planifică săptămâna. Tu doar aprobi. Ritmul nu se rupe." },
  { n: "04", problem: "Agenții care mănâncă marja", solve: "Calitate de studio, fără retainer. Anualul e jumătate. Anulezi într-un click." },
  { n: "05", problem: "Trei platforme, trei joburi", solve: "Un manager pentru Instagram, Facebook și TikTok. Conectezi o dată." },
  { n: "06", problem: "Nu știi ce a mers", solve: "Vezi ce a fost publicat, ce a fost aprobat și ce reclamă a adus solicitări." },
];

const quotes = [
  { who: "Ana · florărie, Cluj", q: "Am trimis pozele din vitrină joi. Duminică cineva a cerut buchetul exact din cadru." },
  { who: "Mihai · service, Brașov", q: "Nu mai stau seara să mă gândesc ce să pun. Aprob din mașină, între două mașini." },
  { who: "Ioana · studio, București", q: "Am oprit colaborarea cu omul care-mi «ținea pagina». Ritmul e mai liniștit și mai des." },
  { who: "Radu · cafenea, Iași", q: "Reclama a adus trei mesaje în prima săptămână. Unul a devenit rezervare de brunch." },
];

function Home() {
  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden pb-16 pt-20 sm:pb-24 sm:pt-36">
        <div className="m-hero-glow" />
        <div className="m-container relative z-10 text-center">
          <Reveal>
            <div className="inline-flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
              <span className="inline-flex items-center gap-1 text-[13px] text-white/70">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-emerald-400 text-emerald-400" />
                ))}
                <span className="ml-1">4.8 / 5</span>
              </span>
              <span className="hidden text-white/25 sm:inline">·</span>
              <span className="text-[13px] text-white/45">Folosit de afaceri locale din România</span>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mx-auto mt-7 max-w-4xl text-[2.6rem] leading-[1.05] tracking-[-0.05em] sm:text-6xl lg:text-[4.25rem] lg:leading-[1.02]">
              Nu mai aștepta o agenție<br className="hidden sm:block" /> să-ți facă postările.
            </h1>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">
              Reels, postări și reclame pentru <span className="m-mark">Instagram, Facebook și TikTok</span>, publicate dintr-un click.
              Primul reel îl vezi înainte să plătești.
            </p>
          </Reveal>

          <Reveal delay={0.2} className="mx-auto mt-10 max-w-2xl">
            <Composer />
          </Reveal>
        </div>

        {/* Product showcase */}
        <Reveal delay={0.28} className="m-container relative z-10 mt-14 sm:mt-20">
          <div className="m-panel relative overflow-hidden p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-3 pb-3 sm:px-4">
              <div className="flex items-center gap-2.5 text-[13px]">
                <span className="m-dot-live" />
                <span className="font-medium text-white">LIVE</span>
                <span className="text-white/40">Generează săptămâna · 12 piese create</span>
              </div>
              <span className="hidden text-[12px] text-white/35 sm:inline">Brand Brain · confirmat</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              {[
                { t: "Reel 15s", s: "2.4x", c: "from-sky-500/40 to-indigo-900/60" },
                { t: "Carousel", s: "1.8x", c: "from-violet-500/40 to-slate-900/70" },
                { t: "Ofertă", s: "3.1x", c: "from-emerald-500/35 to-slate-900/70" },
                { t: "Story CTA", s: "1.6x", c: "from-amber-500/35 to-slate-900/70" },
              ].map((tile, i) => (
                <div
                  key={tile.t}
                  className={`relative aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-br ${tile.c} p-3 ${i === 2 ? "ring-2 ring-[var(--m-accent)]" : ""}`}
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <p className="text-[11px] text-white/60">{tile.t}</p>
                  <p className="mt-auto absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <span className="text-sm font-medium text-white">Gata</span>
                    <span className="rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-[var(--m-accent)] backdrop-blur">
                      {tile.s}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* WHY MORE */}
      <section className="relative py-20 sm:py-32">
        <div className="m-container grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="m-panel p-6 sm:p-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-4xl tracking-tight text-white sm:text-5xl">8 teste</p>
                  <p className="mt-1 text-sm text-white/40">săptămâna asta</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl tracking-tight text-[var(--m-accent)]">1 winner</p>
                  <p className="mt-1 text-sm text-white/40">promovat</p>
                </div>
              </div>
              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/8">
                <div className="h-full w-[62%] rounded-full bg-[var(--m-accent)]" />
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2">
                {["0.9x", "1.2x", "2.6x", "1.1x"].map((v, i) => (
                  <div key={v} className={`rounded-xl border p-3 text-center text-[12px] ${i === 2 ? "border-[var(--m-accent)] bg-[var(--m-accent-soft)] text-white" : "border-white/8 text-white/45"}`}>
                    {v}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <Eyebrow>De ce mai mult conținut</Eyebrow>
            <h2 className="mt-4 text-4xl leading-[1.08] sm:text-5xl">
              Mai multe teste găsesc<br />mai mulți câștigători.
            </h2>
            <p className="mt-6 text-[16px] leading-relaxed text-white/55">
              Afacerile care publică constant văd engagement mai bun nu pentru că fiecare postare e perfectă —
              ci pentru că <span className="m-mark">își permit să testeze</span>. Pierderile se opresc. Câștigătorii se repetă.
            </p>
            <Link to="/preturi" className="m-pill m-pill-solid mt-8 inline-flex text-sm">
              Rulează 20 de teste luna asta <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 30 DAYS */}
      <section className="relative py-20 sm:py-28">
        <div className="m-container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>O lună. Patru realități.</Eyebrow>
            <h2 className="mt-4 text-4xl leading-[1.08] sm:text-5xl">
              Aceeași lună. Rezultate care nu se aseamănă.
            </h2>
            <p className="mt-5 text-white/50">
              Același calendar, același brief. Diferența e cine execută.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {months.map((m, i) => (
              <Reveal key={m.title} delay={i * 0.06}>
                <div className={`h-full rounded-2xl border p-5 ${m.tone === "win" ? "border-[var(--m-accent)] bg-[var(--m-accent-soft)]" : "border-white/8 bg-white/[0.02]"}`}>
                  <p className="text-[13px] text-white/40">0{i + 1}</p>
                  <h3 className="mt-3 text-2xl tracking-tight text-white">{m.title}</h3>
                  <ul className="mt-5 space-y-2.5 text-[14px] text-white/55">
                    {m.lines.map((line) => (
                      <li key={line} className="flex gap-2">
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${m.tone === "win" ? "text-[var(--m-accent)]" : "text-white/25"}`} />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" className="m-pill m-pill-solid text-sm">Începe gratuit</Link>
            <Link to="/preturi" className="m-pill m-pill-ghost text-sm">Compară planurile</Link>
          </Reveal>
          <p className="mt-4 text-center text-[13px] text-white/35">Fără card. Anulezi oricând.</p>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative py-10 sm:py-16">
        <div className="m-container space-y-24 sm:space-y-32">
          {features.map((f, i) => (
            <Reveal key={f.title}>
              <div className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                <div>
                  <Eyebrow>{f.eyebrow}</Eyebrow>
                  <h2 className="mt-4 text-4xl leading-[1.08] sm:text-5xl">{f.title}</h2>
                  <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/55">{f.body}</p>
                  <Link
                    to={f.kind === "produs" ? "/produse/$slug" : "/solutii/$slug"}
                    params={{ slug: f.slug }}
                    className="m-pill m-pill-ghost mt-8 inline-flex text-sm"
                  >
                    Vezi cum funcționează <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="m-panel relative aspect-[16/11] overflow-hidden p-6">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,var(--m-glow),transparent_55%)]" />
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-center gap-2 text-[12px] text-white/45">
                      <span className="m-dot-live" /> Preview generat
                    </div>
                    <p className="max-w-xs text-2xl leading-snug tracking-tight text-white sm:text-3xl">
                      {f.title}
                    </p>
                    <div className="flex gap-2">
                      <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[12px] text-white/60">Instagram</span>
                      <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[12px] text-white/60">TikTok</span>
                      <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[12px] text-white/60">Facebook</span>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PRODUCTS / SOLUTIONS STRIP */}
      <section className="py-20 sm:py-28">
        <div className="m-container grid gap-10 lg:grid-cols-2">
          <Reveal>
            <Eyebrow>Produse</Eyebrow>
            <h2 className="mt-4 text-4xl">Tot ce ai nevoie, pe piese.</h2>
            <div className="mt-8 divide-y divide-white/8 border-y border-white/8">
              {PRODUCTS.map((p) => (
                <Link key={p.slug} to="/produse/$slug" params={{ slug: p.slug }} className="group flex items-start justify-between gap-4 py-5">
                  <div>
                    <p className="text-[16px] text-white group-hover:text-[var(--m-accent)]">{p.nav}</p>
                    <p className="mt-1 text-[14px] text-white/40">{p.hint}</p>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-white/25 transition group-hover:text-white" />
                </Link>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <Eyebrow>Soluții</Eyebrow>
            <h2 className="mt-4 text-4xl">După ce vrei să se întâmple.</h2>
            <div className="mt-8 divide-y divide-white/8 border-y border-white/8">
              {SOLUTIONS.map((s) => (
                <Link key={s.slug} to="/solutii/$slug" params={{ slug: s.slug }} className="group flex items-start justify-between gap-4 py-5">
                  <div>
                    <p className="text-[16px] text-white group-hover:text-[var(--m-accent)]">{s.nav}</p>
                    <p className="mt-1 text-[14px] text-white/40">{s.hint}</p>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-white/25 transition group-hover:text-white" />
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CHALLENGES */}
      <section className="py-20 sm:py-28">
        <div className="m-container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl leading-[1.08] sm:text-5xl">
              Cele mai mari probleme de marketing, rezolvate.
            </h2>
            <p className="mt-5 text-white/50">
              Fiecare afacere care crește lovește aceleași ziduri. Iată cum le sparge Social Spark.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {challenges.map((c, i) => (
              <Reveal key={c.n} delay={i * 0.04}>
                <article className="h-full rounded-2xl border border-white/8 bg-white/[0.02] p-6 transition hover:border-white/15 hover:bg-white/[0.04]">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-white/35">{c.n}</span>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">Rezolvat</span>
                  </div>
                  <h3 className="mt-4 text-xl tracking-tight text-white">{c.problem}</h3>
                  <p className="mt-3 text-[14px] leading-relaxed text-white/45">{c.solve}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTES MARQUEE */}
      <section className="overflow-hidden py-16 sm:py-24">
        <Reveal className="m-container text-center">
          <h2 className="text-4xl sm:text-5xl">„Mi-a înlocuit social media managerul.”</h2>
          <p className="mt-4 text-white/45">Câteva voci după prima lună.</p>
        </Reveal>
        <div className="relative mt-12 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="m-marquee flex w-max gap-4">
            {[...quotes, ...quotes].map((q, i) => (
              <figure key={i} className="w-[320px] shrink-0 rounded-2xl border border-white/8 bg-white/[0.03] p-6 sm:w-[380px]">
                <blockquote className="text-[17px] leading-snug tracking-tight text-white/90">“{q.q}”</blockquote>
                <figcaption className="mt-5 text-[12px] uppercase tracking-[0.14em] text-white/35">{q.who}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="py-20 sm:py-28">
        <div className="m-container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <Eyebrow>Prețuri</Eyebrow>
            <h2 className="mt-4 text-4xl sm:text-5xl">Simple. Transparente.</h2>
            <p className="mt-5 text-white/50">
              Un abonament, fără retainer, fără setup. Anualul e exact jumătate. Creditele se reînnoiesc lunar.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
            {[
              { name: "Basic", price: "99", credits: "300" },
              { name: "Pro", price: "249", credits: "1.000", featured: true },
              { name: "Business", price: "349", credits: "2.500" },
            ].map((p) => (
              <div key={p.name} className={`rounded-2xl border p-6 ${p.featured ? "border-[var(--m-accent)] bg-[var(--m-accent-soft)]" : "border-white/8 bg-white/[0.02]"}`}>
                {p.featured && <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--m-accent)]">Recomandat</p>}
                <h3 className="mt-2 text-2xl text-white">{p.name}</h3>
                <p className="mt-4 text-4xl tracking-tight text-white">{p.price} <span className="text-base text-white/40">lei/lună</span></p>
                <p className="mt-2 text-[13px] text-white/40">{p.credits} credite · facturat anual</p>
              </div>
            ))}
          </Reveal>
          <Reveal className="mt-8 text-center">
            <Link to="/preturi" className="m-pill m-pill-solid inline-flex text-sm">
              Vezi toate planurile <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24">
        <div className="m-container max-w-3xl">
          <Reveal>
            <h2 className="text-center text-4xl sm:text-5xl">Întrebări & răspunsuri</h2>
          </Reveal>
          <div className="mt-10 divide-y divide-white/8 border-y border-white/8">
            {FAQS.flatMap((g) => g.items).slice(0, 6).map((item, i) => (
              <Reveal key={item.q} delay={i * 0.03}>
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] text-white">
                    {item.q}
                    <span className="text-white/35 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/45">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link to="/faq" className="text-sm text-white/50 underline underline-offset-4 hover:text-white">Toate întrebările</Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="pb-24 pt-8 sm:pb-32">
        <Reveal className="m-container">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,var(--m-glow),transparent_60%)]" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-4xl leading-[1.08] sm:text-6xl">
                Nu mai lăsa rezultatele pe masă.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-white/50">
                Scrie un paragraf. Vezi schița. Publică. Spoturile de early access au preț preferențial.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/auth" className="m-pill m-pill-solid text-sm">Începe acum</Link>
                <Link to="/preturi" className="m-pill m-pill-ghost text-sm">Vezi prețurile</Link>
              </div>
              <p className="mt-5 text-[13px] text-white/35">Fără card · Fără spam · Anulezi oricând</p>
            </div>
          </div>
        </Reveal>
      </section>
    </PublicLayout>
  );
}
