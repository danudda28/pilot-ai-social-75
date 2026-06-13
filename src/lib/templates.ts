export type Template = {
  id: string;
  label: string;
  emoji: string;
  domain: string;
  businessType: string;
  tone: "profesional" | "prietenos" | "premium" | "amuzant" | "direct";
  goal: "vanzare" | "awareness" | "promovare" | "educare" | "testimonial";
  extraContext?: string;
};

export const TEMPLATES: Template[] = [
  { id: "salon", label: "Salon înfrumusețare", emoji: "💅", domain: "frumusețe",
    businessType: "salon de înfrumusețare", tone: "prietenos", goal: "vanzare",
    extraContext: "promovează manichiură semipermanentă și tratamente faciale" },
  { id: "restaurant", label: "Restaurant / Pizzerie", emoji: "🍕", domain: "food",
    businessType: "restaurant pizza", tone: "prietenos", goal: "promovare",
    extraContext: "ofertă weekend, atmosferă caldă, livrare rapidă" },
  { id: "cafenea", label: "Cafenea", emoji: "☕", domain: "food",
    businessType: "cafenea de specialitate", tone: "premium", goal: "awareness",
    extraContext: "cafea de specialitate, atmosferă cozy" },
  { id: "fitness", label: "Sală fitness / PT", emoji: "💪", domain: "fitness",
    businessType: "sală de fitness", tone: "direct", goal: "vanzare",
    extraContext: "abonamente lunare, antrenor personal disponibil" },
  { id: "clinica", label: "Clinică stomatologică", emoji: "🦷", domain: "medical",
    businessType: "clinică stomatologică", tone: "profesional", goal: "awareness",
    extraContext: "tratamente moderne, echipă cu experiență" },
  { id: "auto", label: "Service auto", emoji: "🔧", domain: "auto",
    businessType: "service auto", tone: "direct", goal: "vanzare",
    extraContext: "ITP rapid, mecanici autorizați" },
  { id: "magazin", label: "Magazin online", emoji: "🛍️", domain: "retail",
    businessType: "magazin online", tone: "prietenos", goal: "promovare",
    extraContext: "produse noi, livrare în 24h" },
  { id: "imobiliare", label: "Agenție imobiliară", emoji: "🏠", domain: "imobiliare",
    businessType: "agenție imobiliară", tone: "profesional", goal: "vanzare" },
  { id: "avocat", label: "Cabinet avocatură", emoji: "⚖️", domain: "legal",
    businessType: "cabinet de avocatură", tone: "profesional", goal: "educare" },
  { id: "tatuaje", label: "Salon tatuaje", emoji: "🎨", domain: "frumusețe",
    businessType: "salon de tatuaje", tone: "premium", goal: "awareness" },
  { id: "florarie", label: "Florărie", emoji: "💐", domain: "retail",
    businessType: "florărie", tone: "prietenos", goal: "promovare",
    extraContext: "buchete personalizate, livrare în aceeași zi" },
  { id: "psiholog", label: "Cabinet psihologie", emoji: "🧠", domain: "wellness",
    businessType: "cabinet de psihologie", tone: "prietenos", goal: "educare" },
];
