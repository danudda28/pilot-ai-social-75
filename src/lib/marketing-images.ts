/** Vizuale marketing (demo). Servite din `/public/marketing`. */

export type MarketingImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

const base = "/marketing";

export const MARKETING_IMAGES = {
  heroDomenii: {
    src: `${base}/01-hero-domenii.webp`,
    width: 1024,
    height: 576,
    alt: "Exemple demonstrative: reel restaurant, carousel fashion, postare beauty și story auto detailing.",
  },
  varianteReclame: {
    src: `${base}/02-variante-reclame-ecommerce.webp`,
    width: 1024,
    height: 682,
    alt: "Șase variante de reclamă pentru același produs e-commerce, pentru teste A/B.",
  },
  comparatieCalendar: {
    src: `${base}/03-comparatie-calendar-fitness.webp`,
    width: 1024,
    height: 576,
    alt: "Comparație ilustrativă: același studio de fitness, patru ritmuri de postare pe lună.",
  },
  pozeReelRestaurant: {
    src: `${base}/04-poze-reel-restaurant.webp`,
    width: 1024,
    height: 682,
    alt: "Fotografii de restaurant transformate într-o previzualizare de reel.",
  },
  reclamaImobiliare: {
    src: `${base}/06-reclama-solicitare-imobiliare.webp`,
    width: 1024,
    height: 512,
    alt: "Reclamă pentru apartament și solicitare de vizionare pe WhatsApp — exemplu demonstrativ.",
  },
  aprobareBeauty: {
    src: `${base}/07-aprobare-whatsapp-beauty.webp`,
    width: 1024,
    height: 682,
    alt: "Aprobare și corectare a unei postări de salon din conversație — exemplu demonstrativ.",
  },
  galerieDomenii: {
    src: `${base}/08-galerie-domenii.webp`,
    width: 1024,
    height: 576,
    alt: "Galerie cu opt tipuri de afaceri: restaurant, fashion, stomatologie, fitness, imobiliare, auto, pensiune, skincare.",
  },
  cumFunctioneaza: {
    src: `${base}/09-cum-functioneaza-fashion.webp`,
    width: 1024,
    height: 512,
    alt: "Patru pași pentru un magazin de haine: descrii, adaugi poze, vezi rezultatul, aprobi.",
  },
  managerStomatologie: {
    src: `${base}/10-manager-stomatologie.webp`,
    width: 1024,
    height: 682,
    alt: "Calendar editorial pentru o clinică dentară, cu brand și platforme conectate — exemplu demonstrativ.",
  },
  reclameAuto: {
    src: `${base}/11-reclame-service-auto.webp`,
    width: 1024,
    height: 576,
    alt: "Reclamă de service auto, setări de buget și solicitare pe WhatsApp — exemplu demonstrativ.",
  },
  whatsappCofetarie: {
    src: `${base}/12-whatsapp-cofetarie.webp`,
    width: 1024,
    height: 512,
    alt: "Alegerea unei postări, corectarea textului și aprobarea publicării — exemplu demonstrativ.",
  },
  clientiFitness: {
    src: `${base}/13-clienti-fitness.webp`,
    width: 1024,
    height: 576,
    alt: "Parcursa demonstrativ: de la postare și reclamă la mesaj și programare într-un studio de fitness.",
  },
  pilotPensiune: {
    src: `${base}/14-pilot-automat-pensiune.webp`,
    width: 1024,
    height: 682,
    alt: "Plan de conținut pe două săptămâni pentru o pensiune montană — exemplu demonstrativ.",
  },
  videoTreiSectoare: {
    src: `${base}/15-video-imobiliare-auto-ecommerce.webp`,
    width: 1024,
    height: 512,
    alt: "Transformări din fotografii în previzualizări de reel: imobiliare, auto și e-commerce.",
  },
  crediteEcommerce: {
    src: `${base}/17-credite-ecommerce.webp`,
    width: 1024,
    height: 576,
    alt: "Explicație credite: 1 reel = 100, 1 imagine = 10, corecturi text = 0.",
  },
  despreAfaceri: {
    src: `${base}/18-despre-afaceri.webp`,
    width: 1024,
    height: 576,
    alt: "Ilustrație cu tipuri de afaceri locale pentru care e făcut Social Spark — nu fotografii ale echipei.",
  },
  blogVanzari: {
    src: `${base}/19-blog-vanzari-fashion.webp`,
    width: 1024,
    height: 576,
    alt: "Din postare fashion în conversație cu clientul — exemplu demonstrativ.",
  },
  blogCalendar: {
    src: `${base}/20-blog-calendar-restaurant.webp`,
    width: 1024,
    height: 576,
    alt: "Idei de conținut pe zile pentru un restaurant — exemplu demonstrativ.",
  },
  authDomenii: {
    src: `${base}/21-auth-domenii.webp`,
    width: 1024,
    height: 538,
    alt: "Exemple de conținut pe domenii și un calendar săptămânal — demonstrație.",
  },
  socialSharing: {
    src: `${base}/22-social-sharing.webp`,
    width: 1024,
    height: 575,
    alt: "Social Spark — postări, reels și reclame pentru afaceri din mai multe domenii.",
  },
  socialSharingOg: {
    src: `${base}/22-social-sharing-og.webp`,
    width: 1200,
    height: 630,
    alt: "Social Spark — postări, reels și reclame pentru afaceri din mai multe domenii.",
  },
} as const satisfies Record<string, MarketingImage>;

export type MarketingImageKey = keyof typeof MARKETING_IMAGES;

/** Origin public pentru meta OG. Override cu VITE_SITE_URL. */
export function siteOrigin() {
  const fromEnv =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SITE_URL) ||
    process.env.VITE_SITE_URL ||
    process.env.SITE_URL ||
    "";
  return String(fromEnv).replace(/\/$/, "") || "https://socialspark.ro";
}

export function absoluteMarketingUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${siteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}
