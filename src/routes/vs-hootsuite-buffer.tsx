import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/vs-hootsuite-buffer")({
  head: () => ({
    meta: [
      { title: "Social Spark vs Hootsuite vs Buffer — comparație pentru afaceri din România" },
      { name: "description", content: "Compară Social Spark cu Hootsuite și Buffer: preț, funcții AI, suport în română și ce e cel mai potrivit pentru o afacere mică din România." },
      { property: "og:title", content: "Social Spark vs Hootsuite vs Buffer" },
      { property: "og:description", content: "Care e cel mai bun tool de social media pentru afacerile mici din România?" },
    ],
  }),
  component: Comparison,
});

const ROWS: { label: string; spark: string | boolean; hoot: string | boolean; buffer: string | boolean }[] = [
  { label: "Preț start lunar", spark: "29 RON", hoot: "$99 (~470 RON)", buffer: "$6/canal (~28 RON)" },
  { label: "Generare copy cu AI în română", spark: true, hoot: false, buffer: false },
  { label: "Generare imagini AI inclusă", spark: true, hoot: false, buffer: false },
  { label: "Suport în limba română", spark: true, hoot: false, buffer: false },
  { label: "Plată în RON, fără card extern", spark: true, hoot: false, buffer: false },
  { label: "Programare Instagram & Facebook", spark: true, hoot: true, buffer: true },
  { label: "Template-uri pentru nișe românești", spark: true, hoot: false, buffer: false },
  { label: "Bulk generate (5-15 postări/click)", spark: true, hoot: false, buffer: false },
  { label: "Calendar editorial vizual", spark: true, hoot: true, buffer: true },
  { label: "Mai mult de 10 conturi", spark: "Plan Pro", hoot: true, buffer: true },
  { label: "Analytics avansat", spark: "În roadmap", hoot: true, buffer: true },
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="h-5 w-5 text-emerald-400 mx-auto" />;
  if (v === false) return <X className="h-5 w-5 text-muted-foreground/60 mx-auto" />;
  return <span className="text-sm">{v}</span>;
}

function Comparison() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <header className="text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">Comparație</span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-bold leading-tight">
            Social Spark vs <span className="gradient-text">Hootsuite & Buffer</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Toate trei programează postări. Doar unul singur a fost gândit pentru afacerile mici din România — cu AI care înțelege diacriticele, plată în RON și template-uri pentru saloane, restaurante și magazine locale.
          </p>
        </header>

        <div className="mt-12 glass-strong rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/30">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Funcție</th>
                  <th className="p-4 font-display font-bold text-primary">Social Spark</th>
                  <th className="p-4 font-display font-bold">Hootsuite</th>
                  <th className="p-4 font-display font-bold">Buffer</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr key={i} className="border-t border-border/40">
                    <td className="p-4 text-foreground/90">{r.label}</td>
                    <td className="p-4 text-center bg-primary/5"><Cell v={r.spark} /></td>
                    <td className="p-4 text-center"><Cell v={r.hoot} /></td>
                    <td className="p-4 text-center"><Cell v={r.buffer} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-5">
          <div className="glass rounded-xl p-6">
            <h3 className="font-display font-bold text-lg">Când alegi Hootsuite?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Dacă ai o echipă de marketing de 5+ oameni și gestionezi 50+ conturi enterprise. Pentru o afacere mică e supradimensionat și scump.</p>
          </div>
          <div className="glass rounded-xl p-6">
            <h3 className="font-display font-bold text-lg">Când alegi Buffer?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Dacă vrei doar să programezi postări (nu să le și generezi) și ești OK cu interfața în engleză. Pentru cineva care își scrie singur textele.</p>
          </div>
          <div className="glass rounded-xl p-6 border-primary/40 border">
            <h3 className="font-display font-bold text-lg text-primary">Când alegi Social Spark?</h3>
            <p className="mt-2 text-sm text-muted-foreground">Dacă ești antreprenor român cu o afacere locală, nu ai timp să scrii postări și vrei AI care înțelege piața din România. La un preț decent în lei.</p>
          </div>
        </div>

        <div className="mt-16 text-center">
          <Link to="/auth" className="inline-block rounded-xl gradient-bg glow px-8 py-4 text-sm font-semibold text-white">
            Încearcă gratuit Social Spark
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">3 postări gratuite, fără card</p>
        </div>
      </section>
    </PublicLayout>
  );
}
