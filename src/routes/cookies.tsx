import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Politica de cookies — Social Spark" },
      { name: "description", content: "Cum folosește Social Spark cookies și tehnologii similare." },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-20 prose prose-invert">
        <h1 className="font-display text-4xl font-bold mb-6">Politica de cookies</h1>
        <p className="text-muted-foreground">Ultima actualizare: {new Date().toLocaleDateString("ro-RO")}</p>

        <h2 className="font-display text-2xl font-bold mt-10 mb-3">Ce sunt cookies?</h2>
        <p className="text-muted-foreground">
          Cookies sunt fișiere text mici stocate pe dispozitivul tău atunci când vizitezi un site web. Ele permit site-ului să-ți rețină acțiunile și preferințele pe o perioadă de timp.
        </p>

        <h2 className="font-display text-2xl font-bold mt-10 mb-3">Ce cookies folosim</h2>
        <ul className="text-muted-foreground space-y-3">
          <li><strong className="text-foreground">Strict necesare:</strong> autentificare, sesiune, preferințe de bază. Acestea nu pot fi dezactivate — fără ele aplicația nu funcționează.</li>
          <li><strong className="text-foreground">Funcționale:</strong> rețin alegerile tale (limbă, temă, brand activ) pentru o experiență coerentă.</li>
          <li><strong className="text-foreground">Analitice (opționale):</strong> ne ajută să înțelegem cum este folosită aplicația, agregat și anonim. Le activezi/dezactivezi din banner-ul de consimțământ.</li>
        </ul>

        <h2 className="font-display text-2xl font-bold mt-10 mb-3">Cum gestionezi cookies</h2>
        <p className="text-muted-foreground">
          Poți accepta sau refuza cookies opționale din banner-ul afișat la prima vizită. Poți modifica oricând setările din browser-ul tău (Chrome, Firefox, Safari, Edge etc.) pentru a bloca, șterge sau primi notificări la fiecare cookie.
        </p>
        <p className="text-muted-foreground mt-4">
          Pentru a-ți retrage consimțământul după ce l-ai dat, șterge cookies din browser sau contactează-ne la <a href="mailto:bogdansergiu.arghir@gmail.com" className="text-primary underline">bogdansergiu.arghir@gmail.com</a>.
        </p>

        <h2 className="font-display text-2xl font-bold mt-10 mb-3">Cookies terțe</h2>
        <p className="text-muted-foreground">
          Atunci când conectezi conturile tale Instagram sau Facebook, Meta poate seta propriile cookies. Consultă <a href="https://www.facebook.com/policies/cookies/" target="_blank" rel="noopener noreferrer" className="text-primary underline">politica Meta de cookies</a>.
        </p>

        <h2 className="font-display text-2xl font-bold mt-10 mb-3">Contact</h2>
        <p className="text-muted-foreground">
          Întrebări despre cookies? Scrie-ne la <a href="mailto:bogdansergiu.arghir@gmail.com" className="text-primary underline">bogdansergiu.arghir@gmail.com</a> sau sună la 0784 227 844.
        </p>
      </div>
    </PublicLayout>
  );
}
