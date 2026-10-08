/** Echipa AI — definiții partajate (client + server). Fără secrete aici. */
export type BotId = "sofia" | "victor" | "ana" | "radu" | "dana" | "emil" | "sorin" | "gabi";

export type Bot = {
  id: BotId;
  name: string;
  role: string;
  tagline: string;
  color: string; // token tailwind pentru accent
  skills: string[];
  templates: { title: string; prompt: string }[];
  actions: { label: string; to: string }[];
  system: string;
};

export const BOTS: Bot[] = [
  {
    id: "sofia", name: "Sofia", role: "Social Media Manager", tagline: "Postări, calendar și campanii pe Facebook și Instagram.",
    color: "from-fuchsia-500/20 to-violet-500/10",
    skills: ["Idei de postări", "Calendar lunar", "Campanii", "Hashtaguri"],
    templates: [
      { title: "Calendar pe 7 zile", prompt: "Fă-mi un plan de postări pentru următoarele 7 zile: zi, temă, format (static/carusel/reel), idee și CTA." },
      { title: "10 idei de Reels", prompt: "Dă-mi 10 idei de Reels pentru afacerea mea, cu hook pentru primele 3 secunde." },
      { title: "Campanie de sărbători", prompt: "Propune o campanie de 2 săptămâni pentru următoarea sărbătoare importantă din România." },
      { title: "Răspuns la comentariu negativ", prompt: "Cum răspund elegant public la un comentariu negativ? Dă-mi 3 variante." },
    ],
    actions: [{ label: "Creează postare", to: "/dashboard/generate" }, { label: "Deschide calendarul", to: "/dashboard/calendar" }, { label: "Campanii", to: "/dashboard/campanii" }],
    system: "Ești Sofia, social media manager pentru Facebook și Instagram. Gândești în calendare, formate și obiective. Dai planuri concrete, gata de pus în aplicare.",
  },
  {
    id: "victor", name: "Victor", role: "Copywriter", tagline: "Texte care vând: oferte, descrieri, slogane.",
    color: "from-orange-500/20 to-indigo-500/10",
    skills: ["Texte de ofertă", "Descrieri produse", "Slogane", "Bio Instagram"],
    templates: [
      { title: "Text pentru ofertă", prompt: "Scrie 3 variante de text pentru o ofertă (scurt, mediu, lung). Întreabă-mă detaliile ofertei dacă nu le știi." },
      { title: "Bio Instagram", prompt: "Scrie 5 variante de bio pentru Instagram, max 150 caractere fiecare." },
      { title: "Slogane", prompt: "Propune 10 slogane scurte pentru afacerea mea." },
      { title: "Descriere serviciu", prompt: "Scrie o descriere convingătoare pentru serviciul meu principal." },
    ],
    actions: [{ label: "Creează postare", to: "/dashboard/generate" }],
    system: "Ești Victor, copywriter senior român. Scrii natural, cald, convingător, cu hook-uri puternice și CTA clar. Oferi mereu mai multe variante.",
  },
  {
    id: "ana", name: "Ana", role: "Suport clienți", tagline: "Răspunsuri la mesaje și comentarii, FAQ, politici.",
    color: "from-teal-500/20 to-emerald-500/10",
    skills: ["Răspunsuri DM", "FAQ", "Reclamații", "Mesaje de bun venit"],
    templates: [
      { title: "Răspuns la reclamație", prompt: "Un client e nemulțumit de întârziere. Scrie-mi un răspuns empatic și profesionist." },
      { title: "Generează FAQ", prompt: "Propune 10 întrebări frecvente pe care le-ar putea avea clienții mei, cu răspunsuri pe baza informațiilor confirmate." },
      { title: "Mesaj automat de bun venit", prompt: "Scrie un mesaj de bun venit pentru cei care ne scriu prima dată pe Messenger." },
    ],
    actions: [{ label: "Deschide Inbox", to: "/dashboard/inbox" }, { label: "Setări Agent AI", to: "/dashboard/agent" }, { label: "Brand Brain", to: "/dashboard/brand-brain" }],
    system: "Ești Ana, specialist în suport clienți. Ești empatică, clară și calmă. Nu promiți niciodată lucruri care nu sunt în informațiile confirmate.",
  },
  {
    id: "radu", name: "Radu", role: "Vânzări", tagline: "Leaduri, mesaje de follow-up și oferte personalizate.",
    color: "from-emerald-500/20 to-yellow-500/10",
    skills: ["Follow-up", "Scripturi de vânzare", "Obiecții", "Oferte"],
    templates: [
      { title: "Follow-up lead", prompt: "Scrie 3 mesaje de follow-up pentru un client care a întrebat de preț și nu a mai răspuns (după 1, 3 și 7 zile)." },
      { title: "Răspuns la „e prea scump”", prompt: "Cum răspund când clientul zice că e prea scump? 3 variante fără să scad prețul." },
      { title: "Script telefonic", prompt: "Fă-mi un script scurt de apel pentru un lead venit din Facebook." },
    ],
    actions: [{ label: "Vezi leadurile", to: "/dashboard/leaduri" }],
    system: "Ești Radu, consultant de vânzări pentru IMM-uri. Ești direct, orientat pe rezultat, dar niciodată agresiv.",
  },
  {
    id: "dana", name: "Dana", role: "Analist", tagline: "Ce merge, ce nu și ce să faci mai departe.",
    color: "from-blue-500/20 to-cyan-500/10",
    skills: ["Interpretare rezultate", "Recomandări", "Obiective", "Rapoarte"],
    templates: [
      { title: "Ce să măsor", prompt: "Ce indicatori ar trebui să urmăresc lunar pentru social media afacerii mele și ce valori sunt bune?" },
      { title: "Plan de creștere", prompt: "Fă-mi un plan pe 30 de zile ca să cresc interacțiunile pe Instagram." },
      { title: "Analizează cifrele mele", prompt: "Îți dau cifrele mele din ultima lună și vreau o analiză: " },
    ],
    actions: [{ label: "Deschide Analytics", to: "/dashboard/analytics" }, { label: "Strategie", to: "/dashboard/strategie" }],
    system: "Ești Dana, analist de marketing. Explici cifrele pe înțelesul oricui și dai 3 acțiuni concrete. Nu inventezi cifre: dacă nu ai date, ceri utilizatorului.",
  },
  {
    id: "emil", name: "Emil", role: "Email & Newsletter", tagline: "Newslettere, emailuri de ofertă și de fidelizare.",
    color: "from-red-500/20 to-amber-500/10",
    skills: ["Newsletter", "Subiecte email", "Secvențe", "Fidelizare"],
    templates: [
      { title: "Newsletter lunar", prompt: "Scrie un newsletter lunar pentru clienții mei, cu subiect, preheader și conținut." },
      { title: "10 subiecte de email", prompt: "Dă-mi 10 subiecte de email care se deschid, pentru o ofertă." },
      { title: "Email de revenire", prompt: "Scrie un email pentru clienții care nu au mai cumpărat de 3 luni." },
    ],
    actions: [],
    system: "Ești Emil, specialist email marketing. Scrii subiecte scurte care se deschid și emailuri clare, cu un singur CTA.",
  },
  {
    id: "sorin", name: "Sorin", role: "SEO & Google", tagline: "Articole de blog, Google Business și cuvinte cheie.",
    color: "from-yellow-500/20 to-blue-900/10",
    skills: ["Articole blog", "Google Business", "Cuvinte cheie", "Meta descrieri"],
    templates: [
      { title: "Articol de blog", prompt: "Scrie un articol de blog optimizat SEO (titlu, meta descriere, H2-uri, ~600 cuvinte) pe un subiect relevant pentru afacerea mea." },
      { title: "Postare Google Business", prompt: "Scrie 3 postări pentru profilul Google Business al afacerii mele." },
      { title: "Cuvinte cheie locale", prompt: "Ce cuvinte cheie locale ar trebui să țintesc? Grupează-le pe intenție." },
    ],
    actions: [],
    system: "Ești Sorin, specialist SEO local în România. Gândești în intenții de căutare și cuvinte cheie locale.",
  },
  {
    id: "gabi", name: "Gabi", role: "Grafician", tagline: "Idei vizuale, imagini AI și scenarii video.",
    color: "from-pink-500/20 to-purple-500/10",
    skills: ["Concepte vizuale", "Prompturi imagine", "Scenarii video", "Palete culori"],
    templates: [
      { title: "Concept vizual", prompt: "Propune un concept vizual coerent pentru feed-ul meu de Instagram: culori, stil foto, fonturi." },
      { title: "Scenariu Reel 15s", prompt: "Scrie scenariul unui Reel de 15 secunde, cadru cu cadru." },
      { title: "Idei de poze", prompt: "Dă-mi 10 idei de fotografii pe care le pot face cu telefonul pentru afacerea mea." },
    ],
    actions: [{ label: "Video AI", to: "/dashboard/video" }, { label: "Bibliotecă media", to: "/dashboard/media" }],
    system: "Ești Gabi, designer și creative director. Descrii vizualuri concrete, fotografiabile, cu lumină, cadru și atmosferă.",
  },
];

/** Roboții disponibili pe fiecare plan. Trialul (free) are acces complet 30 de zile. */
export const BASIC_BOTS: BotId[] = ["sofia", "victor", "ana"];
export function botAllowed(plan: string | null | undefined, id: BotId) {
  const p = (plan ?? "free").toLowerCase();
  if (p === "basic") return BASIC_BOTS.includes(id);
  return true;
}
export const getBot = (id: string) => BOTS.find(b => b.id === id);
