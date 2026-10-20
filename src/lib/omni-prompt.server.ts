/**
 * Omni: păstrează identitatea produsului, dar evită block pe nume de persoane reale în TEXT.
 * Nu schimbăm forma produsului — doar reformulăm numele de designer din proză.
 */

const PERSON_NAME_PATTERNS: Array<[RegExp, string]> = [
  [/\bjean\s*paul\s*gaultier\b/gi, "the exact perfume bottle from the reference"],
  [/\bgaultier\b/gi, "the reference perfume bottle"],
  [/\bchanel\b/gi, "the exact product from the reference"],
  [/\bdior\b/gi, "the exact product from the reference"],
  [/\byves\s*saint\s*laurent\b|\bysl\b/gi, "the exact product from the reference"],
  [/\bversace\b/gi, "the exact product from the reference"],
  [/\barmani\b/gi, "the exact product from the reference"],
  [/\bpaco\s*rabanne\b/gi, "the exact product from the reference"],
  [/\bcarolina\s*herrera\b/gi, "the exact product from the reference"],
  [/\btom\s*ford\b/gi, "the exact product from the reference"],
];

export function sanitizeOmniPrompt(text: string): string {
  let out = text;
  for (const [re, repl] of PERSON_NAME_PATTERNS) {
    out = out.replace(re, repl);
  }
  // Evită POV „eu sunt…” care mută focusul de pe produs
  out = out.replace(/\b(eu mă simt|mă face să|femeie|femeia|model|influencer)\b/gi, "the product");
  out +=
    " Keep the product/service identity identical to the reference when provided. Prefer product close-ups; avoid inventing a different package.";
  return out;
}
