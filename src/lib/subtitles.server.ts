/** On-screen subtitles for generated clips: cleaned and proofread Romanian, burned in on the client. */

const MAX_LINES = 4;
const MAX_CHARS = 64;

function clean(line: string): string {
  return line
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS)
    .trim();
}

export async function buildSubtitles(lines: Array<string | null | undefined>): Promise<string[]> {
  const base = lines.map((l) => clean(l ?? "")).filter(Boolean).slice(0, MAX_LINES);
  if (!base.length) return [];

  try {
    const { generateGeminiText, getGeminiApiKey } = await import("./gemini.server");
    if (!getGeminiApiKey()) return base;
    const raw = await generateGeminiText(
      [
        "Ești corector de limba română. Corectează subtitrările de mai jos pentru un Reel video.",
        "Reguli: ortografie, gramatică, acord și punctuație corecte; diacritice obligatorii (ă, â, î, ș, ț);",
        `păstrează sensul și ordinea; fiecare rând maxim ${MAX_CHARS} de caractere; fără emoji, fără hashtaguri, fără ghilimele.`,
        'Răspunde DOAR cu JSON: {"lines": ["...", "..."]}, cu exact același număr de rânduri.',
        "",
        JSON.stringify({ lines: base }),
      ].join("\n"),
    );
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = match ? (JSON.parse(match[0]) as { lines?: unknown }) : null;
    const fixed = Array.isArray(parsed?.lines) ? parsed.lines.map((l) => clean(String(l ?? ""))) : [];
    if (fixed.length === base.length && fixed.every(Boolean)) return fixed;
  } catch (e) {
    console.warn("[subtitles] proofreading failed, using original lines:", e);
  }
  return base;
}
