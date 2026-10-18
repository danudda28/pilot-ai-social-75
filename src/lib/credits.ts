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
    id: "basic",
    name: "Basic",
    summary: "Pentru prima prezență constantă: postări și imagini AI, fără efort zilnic.",
    monthly: 99,
    yearly: 49,
    credits: 300,
    brands: 1,
    includes: [
      "Postări și imagini generate cu AI",
      "Facebook și Instagram, conectate oficial",
      "Calendar cu programare automată",
      "Inbox AI cu propuneri de răspuns",
      "30 de zile gratuite, fără card",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    summary: "Pentru afacerea care crește: mai mult conținut, video AI și prioritate.",
    monthly: 249,
    yearly: 124,
    credits: 1000,
    brands: 2,
    featured: true,
    includes: [
      "Tot ce e în Basic",
      "Video AI cu voce în română",
      "Răspunsuri automate în Inbox",
      "Detectare automată de leaduri",
      "Coadă de generare prioritară",
    ],
  },
  {
    id: "business",
    name: "Business",
    summary: "Pentru echipe și mai multe branduri: volum mare și suport dedicat.",
    monthly: 349,
    yearly: 174,
    credits: 2500,
    brands: 3,
    includes: [
      "Tot ce e în Pro",
      "Până la 3 branduri",
      "Locuri pentru echipă",
      "Integrare CRM prin webhook",
      "Suport prioritar",
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
