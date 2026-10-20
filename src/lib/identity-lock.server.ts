/**
 * Prompt universal: produs / serviciu din referință = IDENTIC (formă, text, culori, logo).
 * + orice text vizibil / copy = română corectă (diacritice, fără greșeli).
 */

/** Text românesc corect — obligatoriu pentru copy, subtitrări, overlay-uri, caption pe scenă. */
export const RO_TEXT_QUALITY = `
LIMBA ROMÂNĂ — CALITATE OBLIGATORIE (orice tip de afacere):
- Tot textul destinatarului final (caption, title, CTA, hook, subtitrări, badge promo, text pe imagine/video) trebuie să fie în română corectă.
- Folosește diacritice: ă, â, î, ș, ț (nu "s", "t" în loc de ș/ț).
- Gramatică și ortografie corecte: acord, conjugare, virgule, fără greșeli tip "si" în loc de "și", "intr-o" → "într-o", "ca sa" → "ca să".
- Fără engleză inventată pe ecran (OK doar branduri/nume proprii care există pe produsul real).
- Fără gibberish, litere lipsă, cuvinte lipite sau text AI ilizibil pe imagine/video.
- Dacă adaugi text pe vizual: scurt, clar, 100% lizibil, ortografiat exact.
- Excepție: textul DE PE AMBALAJUL/REFERINȚA reală rămâne neschimbat (chiar dacă e în altă limbă) — nu-l „traduce” pe sticlă/etichetă.
`.trim();

/** Bloc de reguli — atașat la orice generare vizuală cu referință. */
export const IDENTITY_LOCK = `
IDENTITY LOCK (MANDATORY — overrides creative freedom):
You are given a REFERENCE image of the client's real product OR service context.
You MUST keep that subject 100% identical. Do NOT redesign, restyle, "improve", or invent a substitute.

IF PRODUCT (bottle, box, food, device, clothing, menu item, etc.):
- Same shape, proportions, silhouette, materials, colors, label layout, typography, logos, symbols.
- Same readable text on packaging — letter-for-letter, including diacritics / brand spelling.
- Do NOT invent a different brand, bottle, label, or "similar luxury" lookalike.
- Camera / lighting / background MAY change; the product itself MUST NOT.

IF SERVICE (salon, clinic, gym, restaurant interior, workspace, before/after, staff tools, location):
- Keep the same place, tools, uniforms, signage, furniture layout and any logos/signage text identical.
- Do NOT invent a different shop, different tools, or different branded environment.

FORBIDDEN:
- Replacing the reference with a generic stock product/service.
- Changing label text, logo, colorway, or silhouette "for aesthetics".
- Adding fake people who obscure or replace the product unless the brief requires hands holding THE SAME product.
`.trim();

export function buildLockedImagePrompt(opts: {
  brief: string;
  angle: string;
  visualIdea?: string;
  hasReference: boolean;
  aspect?: "1:1" | "9:16" | "16:9";
  extra?: string;
}): string {
  const aspect =
    opts.aspect === "9:16"
      ? "Vertical 9:16 Instagram/Facebook format."
      : opts.aspect === "16:9"
        ? "Horizontal 16:9 format."
        : "Square 1:1 social format.";

  if (opts.hasReference) {
    return [
      "Professional social media photo (Instagram/Facebook).",
      aspect,
      "Natural lighting, high quality, no watermark, no fake overlays unless brief asks for promo badge.",
      IDENTITY_LOCK,
      RO_TEXT_QUALITY,
      `Client brief: ${opts.brief.slice(0, 500)}`,
      opts.visualIdea ? `Scene idea (environment only — NOT a new product): ${opts.visualIdea}` : "",
      `Camera angle / framing: ${opts.angle}`,
      "The attached image is the ONLY allowed product/service identity. Reproduce it exactly; vary only setting, crop, and light.",
      "Any NEW overlay text you add must be Romanian, with correct diacritics and spelling. Do not garble letters.",
      opts.extra ?? "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "Professional social media photo (Instagram/Facebook).",
    aspect,
    "Natural lighting, high quality, no watermark.",
    "No invented branded packaging. Stay faithful to the verbal brief — do not invent a different product.",
    RO_TEXT_QUALITY,
    `Client brief: ${opts.brief.slice(0, 500)}`,
    opts.visualIdea ? `Visual idea: ${opts.visualIdea}` : "",
    `Angle: ${opts.angle}`,
    "Any NEW overlay text must be Romanian, correct diacritics, no typos or gibberish.",
    opts.extra ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildLockedOmniPrompt(opts: {
  brief: string;
  hook?: string;
  scenes?: string[];
  businessType?: string;
  hasReference: boolean;
}): string {
  const parts = [
    "Vertical 9:16 Instagram Reel, cinematic, natural motion, product/service fidelity first.",
    IDENTITY_LOCK,
    RO_TEXT_QUALITY,
    opts.hasReference
      ? "The attached reference image is the EXACT product/service. Animate / film THAT subject only. Do not morph it into another design."
      : "No reference image — stay strictly faithful to the brief; do not invent a different branded product.",
    opts.businessType ? `Business type: ${opts.businessType}.` : "",
    `Brief: ${opts.brief.slice(0, 500)}`,
    opts.hook ? `Hook / mood: ${opts.hook}` : "",
    opts.scenes?.length ? `Beats (Romanian captions if shown): ${opts.scenes.join(" → ")}` : "",
    "Prefer close-ups that keep packaging/service details sharp and unchanged.",
    "If you burn text on screen: Romanian only, perfect spelling and diacritics, short and legible. Prefer no new text; keep package label text unchanged.",
    "No watermark.",
  ];
  return parts.filter(Boolean).join("\n");
}

/** Instrucțiuni TTS — română naturală, umană, nu „robot de reel”. */
export const NATURAL_RO_VOICE = `
Vorbește în limba română literară vorbită, ca un om real care explică prietenos ceva unui client — nu ca un presenter de reclamă TV și nu ca un robot.
Ritm natural: pauze scurte, respirație ușoară, variație de intonație.
Ton cald, clar, conversațional; energie moderată (nu țipi, nu șoptești).
Pronunție corectă, inclusiv diacritice (ă, â, î, ș, ț); fără englezisme forțate.
Nu suna a voice-over de mall sau a asistent AI.
Citește textul exact cum e scris — nu inventa greșeli.
`.trim();

/** Notă pentru copywriter: visual_idea / imagePrompt nu au voie să redeseneze produsul. */
export const COPY_REF_RULES = `
REGULĂ VIZUALĂ (dacă există referință produs/serviciu):
- În visual_idea și imagePrompt descrie DOAR decorul, lumina, unghiul, mâinile care țin ACELAȘI produs.
- NU descrie un alt ambalaj, altă formă, alte culori sau alt text pe etichetă.
- Produsul/serviciul din referință rămâne neschimbat 100%.
`.trim();

/** Reguli copy — română corectă pentru orice domeniu. */
export const COPY_RO_RULES = `
LIMBĂ (OBLIGATORIU):
- title, copy, short_copy, call_to_action, reel_hook, caption pe scene: DOAR română corectă, cu diacritice.
- Fără greșeli gramaticale, fără engleză inutilă (excepție: nume de brand/produs reale).
- Hashtaguri: mix RO/EN ok, dar frazele din postare rămân românești.
- Verifică mental: acord subiect-predicat, „să” / „că”, „într-o”, „și”, „când”.
`.trim();
