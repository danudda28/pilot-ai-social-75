import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";
import { BLOG_POSTS } from "@/lib/blog";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

const CONTENT: Record<string, { intro: string; sections: { h: string; body: string }[] }> = {
  "cum-cresti-vanzarile-pe-instagram-2026": {
    intro: "Instagram a devenit, pentru majoritatea afacerilor mici din România, principalul canal de achiziție de clienți. Dar 90% dintre saloane, restaurante și magazine fac aceleași 3 greșeli care le țin sub 1000 de followers și fără vânzări reale. În acest ghid îți arăt strategia exactă pe care o folosesc afacerile care fac 100+ comenzi/lună doar din social.",
    sections: [
      { h: "1. Consistența bate perfecțiunea", body: "Algoritmul Instagram recompensează conturile care postează regulat. 3 postări pe săptămână, la aceleași ore, generează în 60 de zile o creștere medie de 47% a reach-ului organic. Nu trebuie să fie postări de revistă — trebuie să fie consistente. Folosește o unealtă de planificare (cum e Social Spark) ca să nu mai uiți zile întregi." },
      { h: "2. Hook-ul din primele 3 secunde", body: "Pe feed, userii decid în mai puțin de 1 secundă dacă opresc scroll-ul. Începe cu o întrebare directă, un număr surprinzător sau o promisiune clară. Exemple: «Greșeala #1 pe care o fac saloanele când răspund la mesaje», «În ce zi a săptămânii se vinde de 3x mai mult», «Această ofertă expiră duminică»." },
      { h: "3. CTA-ul specific (nu «contactați-ne»)", body: "«Sună acum la 07XX», «Scrie-ne în DM cuvântul OFERTĂ», «Rezervă pe link în bio» — toate convertesc de 5-10x mai bine decât genericul «pentru detalii ne contactați». Fii specific: ce face userul, exact, după ce vede postarea?" },
      { h: "4. Reels-uri scurte > postări statice", body: "Reach-ul organic pentru Reels este, în 2026, de aproximativ 4x mai mare decât pentru postările statice. Filmează 15-30 secunde, vertical, cu subtitrări (85% din utilizatori vizionează fără sunet). Nu ai nevoie de echipament — un telefon și lumină naturală sunt suficiente." },
      { h: "5. Răspunde la DM-uri în maxim 1 oră", body: "Studiile arată că 78% dintre clienți cumpără de la prima afacere care le răspunde. Dacă răspunzi mai târziu de o oră, rata de conversie scade dramatic. Folosește răspunsuri rapide salvate pentru întrebări frecvente." },
      { h: "Concluzie", body: "Nu ai nevoie de bugete uriașe sau de agenții scumpe. Ai nevoie de consistență, mesaje clare și răspunsuri rapide. Începe cu 3 postări pe săptămână, măsoară timp de 30 de zile, și vei vedea diferența." },
    ],
  },
  "frecventa-postari-instagram-facebook": {
    intro: "«De câte ori să postez?» este cea mai frecventă întrebare pe care o primim de la antreprenori. Răspunsul depinde de tipul afacerii, dar avem date clare pentru fiecare nișă populară din România.",
    sections: [
      { h: "Saloane și beauty: 4-5 postări/săptămână + 2 stories/zi", body: "Beauty trăiește din imagini. Postează before/after-uri, procese (timelapse-uri scurte) și recomandări. Stories zilnice pentru disponibilitate și oferte de ultim moment." },
      { h: "Restaurante și cafenele: 3-4 postări/săptămână + stories zilnice", body: "Postează meniul săptămânii, atmosfera și clienții fericiți (cu permisiune). Stories pentru oferte de prânz și evenimente în acea zi." },
      { h: "Magazine online: 5-7 postări/săptămână", body: "Produse noi, mini-tutoriale, recenzii de la clienți, oferte. Algoritmul răsplătește volumul când conținutul e variat." },
      { h: "Servicii (avocați, contabili, consultanți): 2-3 postări/săptămână", body: "Educare. Postări tip «știați că», «greșeli frecvente», «ce e nou în legislație». Calitatea bate cantitatea aici." },
      { h: "Cele mai bune ore pentru România", body: "Diminețile (8:00-9:00) și serile (19:00-21:00) au cele mai mari rate de engagement. Marți, miercuri și joi sunt cele mai puternice zile pentru organic." },
      { h: "Cum să nu te epuizezi", body: "Folosește bulk generation (poți crea 5-15 postări într-o singură sesiune cu Social Spark), apoi le programezi pentru toată săptămâna. 30 minute pe săptămână = prezență consistentă." },
    ],
  },
};

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = BLOG_POSTS.find(p => p.slug === params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p) return { meta: [{ title: "Articol — Social Spark" }] };
    return {
      meta: [
        { title: `${p.title} — Social Spark` },
        { name: "description", content: p.description },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.description },
        { property: "og:type", content: "article" },
        { property: "article:published_time", content: p.date },
      ],
    };
  },
  errorComponent: () => <div className="p-12 text-center">Eroare la încărcarea articolului.</div>,
  notFoundComponent: () => (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Articol negăsit</h1>
        <Link to="/blog" className="mt-6 inline-block text-primary underline">Înapoi la blog</Link>
      </div>
    </PublicLayout>
  ),
  component: Article,
});

function Article() {
  const { post } = Route.useLoaderData();
  const content = CONTENT[post.slug];

  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Înapoi la blog
        </Link>

        <header className="mt-6">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">{post.category}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(post.date).toLocaleDateString("ro-RO")}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.readMinutes} min citire</span>
          </div>
          <h1 className="mt-4 font-display text-3xl sm:text-5xl font-bold leading-tight">{post.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
        </header>

        <figure className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          <img
            src={post.cover.src}
            alt={post.cover.alt}
            width={post.cover.width}
            height={post.cover.height}
            loading="eager"
            decoding="async"
            className="h-auto w-full object-contain"
          />
          <figcaption className="px-4 py-2 text-center text-xs text-muted-foreground">
            Exemplu demonstrativ
          </figcaption>
        </figure>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
          {content && (
            <>
              <p className="text-foreground/90">{content.intro}</p>
              {content.sections.map((s, i) => (
                <section key={i}>
                  <h2 className="font-display text-2xl font-bold mt-8 mb-3">{s.h}</h2>
                  <p className="text-foreground/85">{s.body}</p>
                </section>
              ))}
            </>
          )}
        </div>

        <div className="mt-16 glass-strong rounded-2xl p-8 text-center">
          <h3 className="font-display text-2xl font-bold">Vrei să aplici asta fără să consumi timp?</h3>
          <p className="mt-2 text-muted-foreground">Social Spark generează cu AI postări pentru afacerea ta în limba română și le programează automat.</p>
          <Link to="/auth" className="mt-4 inline-block rounded-xl gradient-bg glow px-6 py-3 text-sm font-semibold text-white">
            Începe gratuit
          </Link>
        </div>
      </article>
    </PublicLayout>
  );
}
