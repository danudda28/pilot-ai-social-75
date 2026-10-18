export const CREDIT_REEL = 100;
export const CREDIT_IMAGE = 10;
export const CREDIT_EDIT = 0;

export type BillingCycle = "year" | "month";

export type Plan = {
  id: string;
  name: string;
  summary: string;
  monthly: number;
  yearly: number;
  credits: number;
  brands: number;
  featured?: boolean;
  includes: string[];
};

export const PLANS: Plan[] = [
  {
    id: "debut",
    name: "Debut",
    summary: "Pentru prima prezență constantă: un reel și un feed care nu se oprește.",
    monthly: 90,
    yearly: 45,
    credits: 240,
    brands: 1,
    includes: [
      "Creare de conținut cu AI",
      "Instagram și Facebook, conectate oficial",
      "Calendar săptămânal",
      "Corecturi fără credite",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    summary: "Ritm de studio: reels cu voce, imagini finite și publicare la ora potrivită.",
    monthly: 280,
    yearly: 140,
    credits: 800,
    brands: 1,
    includes: [
      "Tot ce e în Debut",
      "Voce și subtitrări în română",
      "Coadă de generare prioritară",
      "Aprobare din chat",
    ],
  },
  {
    id: "maison",
    name: "Maison",
    summary: "Pentru afacerea care vrea clienți, nu doar vizualizări.",
    monthly: 480,
    yearly: 240,
    credits: 2000,
    brands: 2,
    featured: true,
    includes: [
      "Tot ce e în Studio",
      "Reclame Meta cu buget ales de tine",
      "Solicitările ajung în WhatsApp",
      "Acces timpuriu la funcții noi",
    ],
  },
  {
    id: "semnatura",
    name: "Semnătură",
    summary: "Pentru un brand cu pretenții: procesare imediată și un om care răspunde.",
    monthly: 980,
    yearly: 490,
    credits: 4200,
    brands: 3,
    includes: [
      "Tot ce e în Maison",
      "Procesare prioritară",
      "Voce de brand blocată pe cont",
      "Suport dedicat",
    ],
  },
  {
    id: "agentie",
    name: "Agenție",
    summary: "Mai multe conturi, o singură factură, o bibliotecă comună.",
    monthly: 4800,
    yearly: 2400,
    credits: 18000,
    brands: 12,
    includes: [
      "Tot ce e în Semnătură",
      "Locuri pentru echipă",
      "Arhitect de cont la onboarding",
    ],
  },
];

export const TOP_UPS = [
  { id: "scurt", label: "Pachet scurt", credits: 200, price: 49 },
  { id: "luna", label: "Pachet de lună", credits: 800, price: 179 },
  { id: "campanie", label: "Pachet de campanie", credits: 2000, price: 399 },
];

export const PLAN_KEY = "ss-plan";
export const BRIEF_KEY = "ss-brief";

export function priceOf(plan: Plan, cycle: BillingCycle) {
  return cycle === "year" ? plan.yearly : plan.monthly;
}

export function annualBill(plan: Plan) {
  return plan.yearly * 12;
}

export function savingsPercent(plan: Plan) {
  return Math.round((1 - plan.yearly / plan.monthly) * 100);
}

export function yieldOf(credits: number) {
  return {
    reels: Math.floor(credits / CREDIT_REEL),
    images: Math.floor(credits / CREDIT_IMAGE),
  };
}

export function creditsNeeded(reels: number, images: number) {
  return Math.max(0, reels) * CREDIT_REEL + Math.max(0, images) * CREDIT_IMAGE;
}

export function recommendPlan(reels: number, images: number) {
  const need = creditsNeeded(reels, images);
  return PLANS.find((plan) => plan.credits >= need) ?? PLANS[PLANS.length - 1];
}

export function lei(amount: number) {
  return `${new Intl.NumberFormat("ro-RO").format(amount)} lei`;
}

export type StoryboardBeat = { time: string; title: string; body: string };

export type Storyboard = {
  beats: StoryboardBeat[];
  caption: string;
  hashtags: string[];
  hook: string;
};

export function buildStoryboard(text: string): Storyboard {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const hook = sentences[0] || "Afacerea ta, spusă fără ocolișuri.";
  const proof = sentences[1] || "Locul, produsul și mâinile care lucrează.";
  const ask = sentences[2] || "Un singur pas: mesaj, rezervare sau vizită.";
  const skip = new Set(["suntem", "sunt", "facem", "pentru", "oamenii", "despre", "noastra", "noastră", "unde", "care", "acest", "aceasta", "această", "foarte", "poate", "avem", "oferim", "lucram", "lucrăm", "clientii", "clienții", "afaceri", "afacere"]);
  const words = clean
    .toLowerCase()
    .replace(/[^a-zăâîșț0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4 && !skip.has(word));
  const tags = [...new Set(words)].slice(0, 4).map((word) => `#${word}`);

  return {
    hook,
    beats: [
      { time: "0–3s", title: "Hook", body: hook },
      { time: "3–8s", title: "Dovadă", body: "Cadre din pozele tale: spațiul, produsul, detaliul care se vede." },
      { time: "8–12s", title: "Diferența", body: proof },
      { time: "12–15s", title: "Invitație", body: ask },
    ],
    caption: [hook, proof].join(". ").replace(/\.\./g, "."),
    hashtags: ["#afacere", ...tags].slice(0, 5),
  };
}
