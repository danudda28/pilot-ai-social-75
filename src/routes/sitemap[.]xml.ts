import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { BLOG_POSTS } = await import("@/lib/blog");
        const { PRODUCTS, SOLUTIONS } = await import("@/lib/marketing");
        const entries = [
          { path: "/", priority: "1.0", changefreq: "weekly" },
          { path: "/despre", priority: "0.8", changefreq: "monthly" },
          { path: "/preturi", priority: "0.9", changefreq: "monthly" },
          { path: "/faq", priority: "0.7", changefreq: "monthly" },
          { path: "/contact", priority: "0.7", changefreq: "monthly" },
          { path: "/blog", priority: "0.8", changefreq: "weekly" },
          ...PRODUCTS.map((item) => ({ path: `/produse/${item.slug}`, priority: "0.8", changefreq: "monthly" as const })),
          ...SOLUTIONS.map((item) => ({ path: `/solutii/${item.slug}`, priority: "0.8", changefreq: "monthly" as const })),
          { path: "/vs-hootsuite-buffer", priority: "0.7", changefreq: "monthly" },
          { path: "/auth", priority: "0.5", changefreq: "yearly" },
          ...BLOG_POSTS.map(p => ({ path: `/blog/${p.slug}`, priority: "0.7", changefreq: "monthly" as const })),
        ];
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries.map(e => `  <url><loc>${BASE_URL}${e.path}</loc><changefreq>${e.changefreq}</changefreq><priority>${e.priority}</priority></url>`),
          `</urlset>`,
        ].join("\n");
        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
