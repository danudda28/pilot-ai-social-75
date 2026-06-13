import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/PublicLayout";

export const Route = createFileRoute("/politica-confidentialitate")({
  head: () => ({
    meta: [
      { title: "Politica de Confidențialitate — AdPilot Social" },
      { name: "description", content: "Cum colectează, folosește și protejează AdPilot Social datele tale personale. Conform GDPR." },
      { property: "og:title", content: "Politica de Confidențialitate — AdPilot Social" },
      { property: "og:description", content: "Cum colectează, folosește și protejează AdPilot Social datele tale personale. Conform GDPR." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20 prose-content">
        <header className="mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold">Politica de Confidențialitate</h1>
          <p className="mt-3 text-sm text-muted-foreground">Ultima actualizare: 13 iunie 2026</p>
        </header>

        <div className="space-y-8 text-foreground/90 leading-relaxed">
          <Section title="1. Cine suntem">
            <p>
              AdPilot Social („noi", „aplicația") este o platformă SaaS de automatizare a postărilor pe rețele sociale
              prin inteligență artificială. Operator de date:{" "}
              <strong>Bogdan Sergiu Arghir</strong>, contact: <a href="mailto:bogdansergiu.arghir@gmail.com" className="text-primary hover:underline">bogdansergiu.arghir@gmail.com</a>,
              telefon: <a href="tel:+40784227844" className="text-primary hover:underline">0784 227 844</a>.
            </p>
          </Section>

          <Section title="2. Ce date colectăm">
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Date de cont:</strong> email, nume, parolă (criptată).</li>
              <li><strong>Date despre firmă:</strong> nume companie, domeniu de activitate, ton de comunicare.</li>
              <li><strong>Conținut generat:</strong> postări create cu AI, imagini, programări.</li>
              <li><strong>Date despre conturile sociale conectate:</strong> token-uri OAuth Meta, ID-uri pagini Facebook/Instagram.</li>
              <li><strong>Date de utilizare:</strong> log-uri tehnice, adresă IP, tip browser.</li>
              <li><strong>Date de plată:</strong> procesate exclusiv de procesatorul nostru de plăți; noi nu stocăm carduri.</li>
            </ul>
          </Section>

          <Section title="3. Cum folosim datele">
            <ul className="list-disc pl-6 space-y-1">
              <li>Pentru a-ți furniza serviciul (generare AI, publicare automată).</li>
              <li>Pentru facturare și suport tehnic.</li>
              <li>Pentru îmbunătățirea produsului (statistici agregate, anonime).</li>
              <li>Pentru a respecta obligații legale (fiscale, contabile).</li>
            </ul>
          </Section>

          <Section title="4. Temei legal (GDPR)">
            <p>
              Prelucrăm datele în baza: executării contractului (art. 6.1.b GDPR), consimțământului tău
              (art. 6.1.a), interesului legitim (art. 6.1.f) și obligațiilor legale (art. 6.1.c).
            </p>
          </Section>

          <Section title="5. Cui transmitem datele">
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Meta Platforms (Facebook, Instagram)</strong> — pentru publicare.</li>
              <li><strong>Furnizori AI</strong> — Google Gemini, prin Lovable AI Gateway, pentru generarea conținutului.</li>
              <li><strong>Procesator de plăți</strong> — pentru abonamente.</li>
              <li><strong>Furnizor de infrastructură cloud</strong> — pentru găzduire și bază de date.</li>
            </ul>
            <p className="mt-2">Nu vindem niciodată datele tale.</p>
          </Section>

          <Section title="6. Cât timp păstrăm datele">
            <p>
              Pe durata contului activ + maxim 3 ani după dezactivare (pentru obligații fiscale).
              Token-urile Meta sunt șterse imediat ce deconectezi contul.
            </p>
          </Section>

          <Section title="7. Drepturile tale">
            <p>Conform GDPR, ai dreptul la:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Acces, rectificare, ștergere („dreptul de a fi uitat").</li>
              <li>Restricționarea sau opoziția la prelucrare.</li>
              <li>Portabilitatea datelor.</li>
              <li>Retragerea consimțământului oricând.</li>
              <li>Plângere la ANSPDCP (<a href="https://www.dataprotection.ro" target="_blank" rel="noreferrer" className="text-primary hover:underline">dataprotection.ro</a>).</li>
            </ul>
            <p className="mt-2">
              Pentru exercitarea oricărui drept, scrie-ne la{" "}
              <a href="mailto:bogdansergiu.arghir@gmail.com" className="text-primary hover:underline">bogdansergiu.arghir@gmail.com</a>.
              Răspundem în maxim 30 de zile.
            </p>
          </Section>

          <Section title="8. Securitate">
            <p>
              Folosim criptare HTTPS, parole hash-uite, token-uri stocate securizat și acces restricționat.
              Niciun sistem nu este 100% sigur, dar aplicăm bune practici de industrie.
            </p>
          </Section>

          <Section title="9. Cookie-uri">
            <p>
              Folosim cookie-uri esențiale (autentificare, sesiune). Nu folosim cookie-uri de marketing
              fără consimțământ explicit.
            </p>
          </Section>

          <Section title="10. Modificări">
            <p>
              Putem actualiza această politică. Te anunțăm prin email sau în aplicație cu cel puțin 14 zile înainte.
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
