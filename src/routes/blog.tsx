import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { BLOG_POSTS } from "@/lib/blog";
import { Calendar, Clock } from "lucide-react";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog Social Spark — strategii social media pentru afaceri din România" },
      { name: "description", content: "Ghiduri practice, tactici și studii de caz pentru a-ți crește afacerea pe Instagram și Facebook. Conținut scris pentru antreprenori români." },
      { property: "og:title", content: "Blog Social Spark — strategii social media" },
      { property: "og:description", content: "Ghiduri practice de marketing pe Instagram și Facebook pentru afaceri locale." },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <PublicLayout>
      <section className="marketing mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <header className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[var(--m-accent)]">
            Blog
          </span>
          <h1 className="mt-4 text-4xl tracking-tight text-white sm:text-5xl">
            Ghiduri care îți cresc afacerea
          </h1>
          <p className="mt-4 text-white/50">
            Tactici concrete pentru Instagram și Facebook, pentru antreprenori români. Fără teorie, doar ce poți aplica.
          </p>
        </header>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {BLOG_POSTS.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="group overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] transition hover:border-white/15"
            >
              <img
                src={p.cover.src}
                alt={p.cover.alt}
                width={p.cover.width}
                height={p.cover.height}
                loading="lazy"
                decoding="async"
                className="aspect-[16/9] w-full object-contain bg-black/40"
              />
              <div className="p-5">
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                  <span className="rounded-full bg-[var(--m-accent-soft)] px-2 py-0.5 text-[var(--m-accent)]">{p.category}</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(p.date).toLocaleDateString("ro-RO")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {p.readMinutes} min
                  </span>
                </div>
                <h2 className="mt-3 text-xl tracking-tight text-white transition group-hover:text-[var(--m-accent)]">
                  {p.title}
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-white/45">{p.description}</p>
                <p className="mt-3 text-[11px] text-white/30">Exemplu demonstrativ pe copertă</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
