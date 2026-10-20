import type { MarketingImageKey } from "@/lib/marketing-images";

export type Story = {
  slug: string;
  kind: "produs" | "solutie";
  nav: string;
  hint: string;
  kicker: string;
  title: string;
  lede: string;
  /** Vizual demo după generator, înaintea pașilor. */
  demoImage?: MarketingImageKey;
  steps: { title: string; body: string }[];
  outcomes: { title: string; body: string }[];
  faqs: { q: string; a: string }[];
};

export const PRODUCTS: Story[] = [
  {
    slug: "cum-functioneaza",
    kind: "produs",
    nav: "Cum funcționează",
    hint: "Un paragraf și câteva poze. Iese un reel pe care îl vezi înainte să plătești.",
    kicker: "Produs",
    title: "Un paragraf. Un reel gata de publicat.",
    lede: "Scrii cu ce te ocupi, unde ești și prin ce te aleg oamenii. Adaugi pozele pe care le ai deja. Social Spark compune scenariul, vocea, descrierea și ora de publicare.",
    demoImage: "cumFunctioneaza",
    steps: [
      { title: "Spui despre afacere", body: "Un singur paragraf. Nu un brief de agenție și nu un formular cu douăzeci de câmpuri." },
      { title: "Adaugi pozele de pe telefon", body: "Masa, vitrina, produsul, mâinile la lucru. Nu e nevoie de o ședință foto." },
      { title: "Primești schița, apoi reel-ul", body: "Vezi structura înainte de cont. În cont, primul reel se generează fără să consumi credite." },
      { title: "Aprobi, apoi se publică", body: "Alegi varianta. Publicarea pleacă când urmăritorii tăi sunt deja online." },
    ],
    outcomes: [
      { title: "Reels de 15 secunde", body: "Scenariu, voce în română, muzică și subtitrări, din fotografiile tale." },
      { title: "Postări cu descriere", body: "Text, îndemn și hashtaguri pe vocea brandului, nu un șablon generic." },
      { title: "Aprobare pe telefon", body: "Două sau trei variante. Publici, ceri o rescriere sau amâni. Corectura nu costă credite." },
    ],
    faqs: [
      { q: "Trebuie să filmez?", a: "Nu. Reel-ul se construiește din poze. Un prezentator apare doar dacă povestea chiar are nevoie de un chip." },
      { q: "Pot vedea ceva înainte să plătesc?", a: "Da. Pe prima pagină scrii paragraful și primești schița. Primul reel din cont este gratuit." },
    ],
  },
  {
    slug: "manager",
    kind: "produs",
    nav: "Social media manager",
    hint: "Reels și postări, publicate pe Instagram și Facebook.",
    kicker: "Produs",
    title: "Social media pentru afacere, rezolvată săptămânal.",
    lede: "Un manager care plănuiește, scrie și publică. Tu aprobi. Conturile rămân ale tale, conectate o singură dată prin integrările oficiale.",
    demoImage: "managerStomatologie",
    steps: [
      { title: "Descrii afacerea o dată", body: "Ce vinzi, cui, în ce oraș și ce nu vrei să se spună niciodată." },
      { title: "Conectezi conturile", body: "Instagram profesional și Pagina de Facebook. Le poți deconecta oricând." },
      { title: "Aprobi săptămâna", body: "Vezi ce urmează să apară. O atingere publică, o alta cere o variantă nouă." },
      { title: "Ritmul continuă", body: "Săptămâna următoare vine singură. Tu nu mai deschizi o aplicație de calendar." },
    ],
    outcomes: [
      { title: "Două platforme, un calendar", body: "Aceeași săptămână, adaptată pentru Instagram și Facebook." },
      { title: "Ora potrivită", body: "Publicarea urmărește orele în care pagina ta chiar primește atenție." },
      { title: "Voce stabilă", body: "Tonul rămâne același de la o săptămână la alta, chiar dacă tu ești în salon sau în bucătărie." },
    ],
    faqs: [
      { q: "Înlocuiește un om?", a: "Înlocuiește munca repetitivă: idei, texte, programare, publicare. Decizia de a publica rămâne la tine." },
      { q: "Pot opri o postare?", a: "Da, până în momentul publicării. După publicare o poți ascunde din contul platformei." },
    ],
  },
  {
    slug: "reclame",
    kind: "produs",
    nav: "Reclame pentru clienți",
    hint: "Reclame din postările tale. Solicitările ajung în WhatsApp.",
    kicker: "Produs",
    title: "Reclama pleacă. Clientul îți scrie.",
    lede: "Alegi o postare deja făcută, setezi bugetul pe zi și oprești campania când vrei. Fiecare solicitare ajunge ca mesaj, cu detaliile, nu într-un tabel pe care nu-l deschide nimeni.",
    demoImage: "reclameAuto",
    steps: [
      { title: "Alegi postarea", body: "Una creată deja sau una pregătită special pentru reclamă." },
      { title: "Stabilești suma pe zi", body: "Tu decizi plafonul. Îl schimbi sau pui campania pe pauză din același loc." },
      { title: "Publicul e local", body: "Zona, vârsta și interesul pornesc de la afacerea ta. Le ajustezi în câteva cuvinte." },
      { title: "Primești solicitarea", body: "Nume, ce vrea și când. Răspunsul pleacă tot din chat." },
    ],
    outcomes: [
      { title: "Bugetul rămâne al tău", body: "Nu există un minim ascuns și nu se cheltuiește peste suma pe care ai pus-o." },
      { title: "Creativ din pozele tale", body: "Textul, cadrul și formularul se construiesc din materialul pe care îl ai deja." },
      { title: "Raport scurt", body: "Câte solicitări, ce a costat una, dacă merită să continui. Fără un dashboard de agenție." },
    ],
    faqs: [
      { q: "Reclamele consumă credite?", a: "Crearea anunțului consumă creditele postării. Bugetul de media îl plătești separat, direct către Meta, și îl controlezi tu." },
      { q: "Pot opri campania azi?", a: "Da. Pauza e imediată. Solicitările deja primite rămân în conversație." },
    ],
  },
  {
    slug: "whatsapp",
    kind: "produs",
    nav: "Pe WhatsApp",
    hint: "Aprobi, corectezi și primești clienți dintr-un singur chat.",
    kicker: "Produs",
    title: "Tot fluxul, din conversația pe care o ai deja deschisă.",
    lede: "Nu mai intri într-un panou ca să spui «da». Reel-ul, varianta alternativă și clientul nou ajung pe WhatsApp. Răspunsul tău e comanda.",
    demoImage: "whatsappCofetarie",
    steps: [
      { title: "Primești varianta", body: "Un reel sau o postare, plus două alternative dacă prima nu sună a ta." },
      { title: "Răspunzi în cuvinte", body: "«Publică la 18», «schimbă prețul», «arată-mi cealaltă». Atât." },
      { title: "Corectura e gratuită", body: "Rescrierea textului nu consumă credite. Un reel nou, da." },
      { title: "Clienții intră în același fir", body: "Când rulezi reclame, solicitarea aterizează lângă aprobări, nu în altă aplicație." },
    ],
    outcomes: [
      { title: "Fără aplicație în plus", body: "Dacă trăiești în WhatsApp cu clienții, și marketingul stă acolo." },
      { title: "Mesaje doar când e o decizie", body: "Nu primești notificări de tip «totul e bine». Primești când trebuie să alegi." },
      { title: "Istoric clar", body: "Ce ai aprobat, ce ai schimbat și ce s-a publicat rămân în conversație." },
    ],
    faqs: [
      { q: "Trebuie să stau în dashboard?", a: "Nu pentru aprobări. Dashboard-ul rămâne pentru calendar, branduri și facturi." },
      { q: "Dacă nu răspund?", a: "Nimic nu se publică fără aprobarea ta, decât dacă ai pornit explicit publicarea automată pe un plan." },
    ],
  },
];

export const SOLUTIONS: Story[] = [
  {
    slug: "clienti",
    kind: "solutie",
    nav: "Mai mulți clienți",
    hint: "Reclame care aduc solicitări, nu doar reach.",
    kicker: "Soluție",
    title: "Clienți în agendă, nu aplauze pe un reel.",
    lede: "Postarea bună atrage priviri. Reclama bine tăiată atrage un om care întreabă de preț. Social Spark le leagă: creează, promovează, îți aduce mesajul.",
    demoImage: "clientiFitness",
    steps: [
      { title: "Pornești de la o postare care deja sună bine", body: "Nu de la un anunț scris de un străin care nu ți-a văzut localul." },
      { title: "Pui un plafon zilnic", body: "O sumă pe care o poți opri mâine fără un telefon cu un account manager." },
      { title: "Răspunzi în aceeași zi", body: "Solicitarea vine cu ce vrea omul. Tu trimiți prețul sau ora liberă." },
    ],
    outcomes: [
      { title: "O solicitare are un cost vizibil", body: "Vezi câți lei a costat un mesaj, nu doar câte impresii ai cumpărat." },
      { title: "Mesajul e al afacerii tale", body: "Aceeași voce ca pe feed, nu un text de campanie generic." },
    ],
    faqs: [
      { q: "Am nevoie de un cont de reclame?", a: "Campania poate rula din contul tău Meta. Bugetul nu trece prin Social Spark." },
    ],
  },
  {
    slug: "pilot-automat",
    kind: "solutie",
    nav: "Pilot automat",
    hint: "Configurezi o dată. Săptămâna se scrie și se programează.",
    kicker: "Soluție",
    title: "Postezi în fiecare săptămână, fără să-ți refaci duminica.",
    lede: "Consistența câștigă în fața unei postări perfecte uitate trei săptămâni. Setezi vocea, conectezi conturile și aprobi ce e deja așezat în calendar.",
    demoImage: "pilotPensiune",
    steps: [
      { title: "Un plan pentru toată săptămâna", body: "Ce apare luni, ce apare joi, ce rămâne pentru story." },
      { title: "Ora e aleasă, nu ghicită", body: "Publicarea urmărește momentele în care pagina ta răspunde." },
      { title: "Săptămâna următoare se pregătește singură", body: "Tu confirmi. Nu reiei briefingul." },
    ],
    outcomes: [
      { title: "Două platforme, același ritm", body: "Instagram și Facebook pleacă dintr-un singur plan." },
      { title: "Liniște între decizii", body: "Primești un mesaj când o piesă e gata, nu un flux de remindere." },
    ],
    faqs: [
      { q: "Câte piese pe săptămână?", a: "Depinde de creditele planului. Debut acoperă o prezență săptămânală. Pro acoperă un ritm de mai multe reels și un feed plin." },
    ],
  },
  {
    slug: "video-fara-filmare",
    kind: "solutie",
    nav: "Video fără filmare",
    hint: "Reels din pozele tale, cu voce în limba clienților.",
    kicker: "Soluție",
    title: "Videoclipuri fără să te pui în fața camerei.",
    lede: "Majoritatea afacerilor au poze și nu au chef de filmat. Din ele se taie un reel cu scenariu, voce, muzică și subtitrări pentru cei care se uită fără sunet.",
    demoImage: "videoTreiSectoare",
    steps: [
      { title: "Pozele devin cadre", body: "Se aleg unghiurile care spun ceva, nu un slideshow cu titlu deasupra." },
      { title: "Scenariul pleacă din paragraful tău", body: "Nu dintr-un trend care n-are legătură cu ce vinzi." },
      { title: "Vocea e în română", body: "Naturală, cu subtitrări. Un prezentator doar când povestea cere un chip." },
    ],
    outcomes: [
      { title: "Modifici textul printr-un mesaj", body: "«Schimbă 89 în 79» întoarce o versiune nouă, fără un credit nou." },
      { title: "Primul reel e pe noi", body: "Îl vezi înainte să alegi un plan." },
    ],
    faqs: [
      { q: "Trebuie să apar eu?", a: "Nu. Dacă vrei un chip în cadru, se poate adăuga. Implicit, protagonistul e munca ta." },
    ],
  },
  {
    slug: "crestere",
    kind: "solutie",
    nav: "Instagram și Facebook",
    hint: "Un manager pentru ambele, conectate o singură dată.",
    kicker: "Soluție",
    title: "Două platforme. Un singur manager.",
    lede: "Nu rescrii aceeași ofertă de două ori și nu ții două calendare. Conectezi conturile, aprobi săptămâna, iar Instagram și Facebook primesc forma potrivită.",
    demoImage: "managerStomatologie",
    steps: [
      { title: "Instagram", body: "Reels și postări, cu descriere și hashtaguri, pe contul profesional." },
      { title: "Facebook", body: "Aceeași idee, pe Pagină, în ritmul pe care pagina îl suportă." },
      { title: "Un singur calendar", body: "Vezi tot ce urmează pe ambele conturi, fără să sari între aplicații." },
    ],
    outcomes: [
      { title: "Conexiuni oficiale Meta", body: "Publicarea trece prin integrările Instagram și Facebook. Deconectarea e imediată." },
      { title: "Un calendar", body: "Vezi tot ce urmează, pe ambele conturi, din același loc." },
    ],
    faqs: [
      { q: "Pot conecta o singură platformă?", a: "Da. Cealaltă rămâne oprită până decizi tu." },
      { q: "Am nevoie de cont de afaceri?", a: "Instagram cere un cont profesional asociat unei Pagini Facebook. Facebook folosește Pagina." },
    ],
  },
];

export const FAQS: { group: string; items: { q: string; a: string }[] }[] = [
  {
    group: "Despre produs",
    items: [
      {
        q: "Ce este Social Spark?",
        a: "Managerul de social media al afacerii tale. Dintr-un paragraf și câteva poze compune reels și postări, le pune în calendar și, dacă vrei, le promovează ca să-ți aducă solicitări.",
      },
      {
        q: "Se cunoaște că e făcut cu AI?",
        a: "Se cunoaște când textul e generic. De aceea pornește din descrierea ta și din pozele tale, iar tu aprobi înainte de publicare. Poți rescrie orice frază.",
      },
      {
        q: "Prin ce diferă de un chat generalist?",
        a: "Un chat îți dă un text. Aici textul are o oră de publicare, o platformă, o imagine și, dacă pornești reclama, un loc unde ajunge clientul.",
      },
    ],
  },
  {
    group: "Credite",
    items: [
      {
        q: "Ce este un credit?",
        a: "Unitatea cu care se plătește creația. Un reel costă 100 de credite. O imagine cu descriere costă 10. O corectură de text costă 0.",
      },
      {
        q: "Ce se întâmplă când se termină creditele?",
        a: "Generarea nouă se oprește. Ce ai aprobat deja se publică în continuare. Poți cumpăra un pachet sau urca un plan, iar creditele intră imediat. Creditele din pachet nefolosite rămân 30 de zile.",
      },
      {
        q: "Pot repara un reel fără să consum credite?",
        a: "Da. Schimbarea textului, a orei sau a descrierii nu consumă credite. Un reel nou, din alte cadre, consumă.",
      },
      {
        q: "Dacă nu folosesc nimic, pot primi banii înapoi?",
        a: "Dacă într-o perioadă facturată nu ai consumat niciun credit, factura aceea se rambursează integral. Creditele folosite nu se întorc.",
      },
    ],
  },
  {
    group: "Planuri",
    items: [
      {
        q: "Pot anula oricând?",
        a: "Da. Anularea oprește reînnoirea. Accesul rămâne până la capătul perioadei plătite. Nu există taxă de ieșire.",
      },
      {
        q: "Pot schimba planul?",
        a: "Upgrade-ul aplică diferența pe zilele rămase și creditele suplimentare intră imediat. Downgrade-ul pornește la următoarea factură, ca să nu pierzi ce ai plătit deja.",
      },
      {
        q: "De ce anualul e jumătate?",
        a: "Plătești douăsprezece luni dintr-o dată și prețul pe lună e exact jumătate din prețul lunar. Procentul afișat e calculat din prețuri, nu e un slogan.",
      },
      {
        q: "Cum funcționează pentru o agenție?",
        a: "Planul Agenție ține până la 12 branduri pe aceeași factură, cu locuri pentru echipă și o bibliotecă comună. Peste acest prag, scrii-ne și tăiem un plan de organizație.",
      },
    ],
  },
];

export function findStory(kind: Story["kind"], slug: string) {
  const list = kind === "produs" ? PRODUCTS : SOLUTIONS;
  return list.find((story) => story.slug === slug);
}
