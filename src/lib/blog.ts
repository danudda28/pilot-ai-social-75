export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readMinutes: number;
  category: string;
  emoji: string;
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "cum-cresti-vanzarile-pe-instagram-2026",
    title: "Cum să crești vânzările pe Instagram în 2026: ghid pentru afaceri locale",
    description: "Strategia completă pentru saloane, restaurante și magazine din România care vor să transforme followers-ii în clienți reali.",
    date: "2026-06-10",
    readMinutes: 8,
    category: "Strategie",
    emoji: "📈",
  },
  {
    slug: "frecventa-postari-instagram-facebook",
    title: "De câte ori pe săptămână ar trebui să postezi pe Instagram și Facebook?",
    description: "Răspunsul scurt: minim 3 postări/săptămână. Răspunsul lung — bazat pe date — îți spune când și ce să postezi pentru fiecare tip de afacere.",
    date: "2026-06-05",
    readMinutes: 6,
    category: "Tactici",
    emoji: "📅",
  },
];
