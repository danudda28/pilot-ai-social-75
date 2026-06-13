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
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <header className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">Blog</span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-bold leading-tight">
            Ghiduri <span className="gradient-text">care îți cresc afacerea</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Tactici concrete pentru Instagram și Facebook, testate cu antreprenori români. Fără teorie, doar ce funcționează.
          </p>
        </header>

        <div className="mt-12 grid sm:grid-cols-2 gap-5">
          {BLOG_POSTS.map(p => (
            <Link key={p.slug} to="/blog/$slug" params={{ slug: p.slug }}
              className="glass-strong rounded-2xl p-6 hover:scale-[1.02] transition-transform group">
              <div className="text-4xl">{p.emoji}</div>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">{p.category}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(p.date).toLocaleDateString("ro-RO")}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{p.readMinutes} min</span>
              </div>
              <h2 className="mt-3 font-display text-xl font-bold group-hover:text-primary transition-colors">{p.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{p.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
