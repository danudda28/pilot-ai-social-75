import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/termeni-si-conditii")({
  head: () => ({
    meta: [
      { title: "Termeni și Condiții — AdPilot Social" },
      { name: "description", content: "Termenii și condițiile de utilizare ale platformei AdPilot Social pentru automatizare postări sociale cu AI." },
      { property: "og:title", content: "Termeni și Condiții — AdPilot Social" },
      { property: "og:description", content: "Termenii și condițiile de utilizare ale platformei AdPilot Social." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20">
        <header className="mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold">Termeni și Condiții</h1>
          <p className="mt-3 text-sm text-muted-foreground">Ultima actualizare: 13 iunie 2026</p>
        </header>

        <div className="space-y-8 text-foreground/90 leading-relaxed">
          <Section title="1. Părțile">
            <p>
              Acești termeni reglementează utilizarea platformei <strong>AdPilot Social</strong>,
              operată de Bogdan Sergiu Arghir, contact:{" "}
              <a href="mailto:bogdansergiu.arghir@gmail.com" className="text-primary hover:underline">bogdansergiu.arghir@gmail.com</a>,
              tel. <a href="tel:+40784227844" className="text-primary hover:underline">0784 227 844</a>.
              Prin crearea unui cont accepți integral acești termeni.
            </p>
          </Section>

          <Section title="2. Descrierea serviciului">
            <p>
              AdPilot Social este o platformă SaaS care permite generarea automată cu AI a postărilor
              pentru Instagram și Facebook, programarea și publicarea lor, precum și gestionarea unui
              calendar de conținut.
            </p>
          </Section>

          <Section title="3. Cont și eligibilitate">
            <ul className="list-disc pl-6 space-y-1">
              <li>Trebuie să ai minim 18 ani sau acordul reprezentantului legal.</li>
              <li>Datele furnizate trebuie să fie reale și actualizate.</li>
              <li>Ești singurul responsabil pentru păstrarea parolei.</li>
              <li>Un cont = o singură persoană fizică/juridică. Nu este permis share-ul.</li>
            </ul>
          </Section>

          <Section title="4. Abonamente și plată">
            <ul className="list-disc pl-6 space-y-1">
              <li>Planurile, limitele și prețurile sunt cele afișate pe pagina <a href="/preturi" className="text-primary hover:underline">/preturi</a>.</li>
              <li>Plata se face anticipat, lunar sau anual.</li>
              <li>Abonamentele se reînnoiesc automat până la anulare.</li>
              <li>Anularea se poate face oricând din contul tău; accesul rămâne activ până la sfârșitul perioadei plătite.</li>
              <li>Conform OUG 34/2014, dreptul de retragere de 14 zile nu se aplică serviciilor digitale începute cu acordul tău expres.</li>
            </ul>
          </Section>

          <Section title="5. Utilizare acceptabilă">
            <p>Este interzis să folosești AdPilot Social pentru:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Conținut ilegal, defăimător, discriminatoriu, pornografic sau care încalcă drepturi de autor.</li>
              <li>Spam, phishing sau practici comerciale înșelătoare.</li>
              <li>Încălcarea termenilor Meta (Facebook/Instagram).</li>
              <li>Reverse engineering, scraping sau utilizare automată abuzivă a API-ului.</li>
            </ul>
            <p className="mt-2">
              Încălcarea acestor reguli duce la suspendarea contului fără rambursare.
            </p>
          </Section>

          <Section title="6. Conținut generat de AI">
            <p>
              Postările generate cu AI sunt instrumente, nu garanții. Ești <strong>singurul responsabil</strong>{" "}
              pentru ce publici prin contul tău. Recomandăm să revizuiești fiecare postare înainte de
              programare. AdPilot nu răspunde pentru consecințele publicării.
            </p>
          </Section>

          <Section title="7. Conturi sociale conectate">
            <p>
              Conexiunea cu Meta (Facebook/Instagram) se face prin OAuth oficial. Folosim token-urile
              doar pentru a publica conținutul tău, conform permisiunilor acordate. Poți deconecta
              oricând conturile din pagina Integrări.
            </p>
          </Section>

          <Section title="8. Proprietate intelectuală">
            <ul className="list-disc pl-6 space-y-1">
              <li>Platforma, brandul și codul AdPilot Social ne aparțin.</li>
              <li>Conținutul generat (text, imagini) îți aparține; ne acorzi licență limitată pentru a-l procesa și publica în numele tău.</li>
            </ul>
          </Section>

          <Section title="9. Disponibilitate și suport">
            <p>
              Ne străduim pentru uptime ridicat, dar nu garantăm 100%. Mentenanța planificată va fi
              anunțată în avans. Suport prin email, răspuns în maxim 48h în zilele lucrătoare.
            </p>
          </Section>

          <Section title="10. Limitarea răspunderii">
            <p>
              În măsura permisă de lege, AdPilot Social nu răspunde pentru daune indirecte, pierderi de
              profit, date sau reputație. Răspunderea totală este limitată la suma plătită de tine în
              ultimele 12 luni.
            </p>
          </Section>

          <Section title="11. Încetarea contractului">
            <p>
              Poți închide contul oricând. Putem suspenda sau închide conturi care încalcă termenii,
              cu sau fără notificare prealabilă, în funcție de gravitate.
            </p>
          </Section>

          <Section title="12. Modificări">
            <p>
              Putem actualiza acești termeni. Modificările majore se notifică cu 14 zile înainte.
              Continuarea utilizării după notificare = acceptare.
            </p>
          </Section>

          <Section title="13. Lege aplicabilă și jurisdicție">
            <p>
              Acești termeni sunt guvernați de legea română. Orice litigiu se soluționează amiabil, iar
              în lipsa unei soluții, de instanțele competente din România. Reclamații consumatori se pot
              depune și pe <a href="https://anpc.ro" target="_blank" rel="noreferrer" className="text-primary hover:underline">anpc.ro</a> sau{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer" className="text-primary hover:underline">platforma SOL UE</a>.
            </p>
          </Section>

          <Section title="14. Contact">
            <p>
              Pentru orice întrebare:{" "}
              <a href="mailto:bogdansergiu.arghir@gmail.com" className="text-primary hover:underline">bogdansergiu.arghir@gmail.com</a> /{" "}
              <a href="tel:+40784227844" className="text-primary hover:underline">0784 227 844</a>.
            </p>
          </Section>
        </div>
      </article>
    </PublicLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold mb-3">{title}</h2>
      <div className="text-muted-foreground space-y-2">{children}</div>
    </section>
  );
}
