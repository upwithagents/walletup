/**
 * Merchant-token extraction from bank-import notes. Notes look like:
 *   "Částka: 300 CZK 26.06.2026 Místo: Pod hvezdickami Braskov"
 *   "JIRI KUCERA REZNIKUZ   KACICE      CZE"
 *   "Green Leaf, BA, Gross."
 * We want the distinctive merchant words to search history with.
 */

const BOILERPLATE = new Set(
  [
    "czk", "eur", "usd", "cze", "svk", "misto", "částka", "castka",
    "datum", "provedení", "provedeni", "transakce", "sum", "up",
    "www", "com", "s.r.o", "sro", "a.s",
  ].map((w) => w.toLowerCase()),
);

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Distinctive tokens (most-specific first), max `limit`. */
export function extractTokens(text: string, limit = 3): string[] {
  const cleaned = normalize(text)
    // strip the czech bank boilerplate prefix if present
    .replace(/castka:\s*[\d.,]+\s*\w{3}\s*[\d.]+\s*/g, "")
    .replace(/misto:\s*/g, "")
    .replace(/datum provedeni transakce:\s*[\d-]+/g, "");

  const words = cleaned
    .split(/[^a-z0-9]+/)
    .filter(
      (w) =>
        w.length >= 4 &&
        !BOILERPLATE.has(w) &&
        !/^\d+$/.test(w) && // pure numbers (amounts, dates, account numbers)
        !/^\d/.test(w), // date fragments like "26.06"
    );

  // Longest words first — more distinctive; keep original order for ties.
  const unique = [...new Set(words)];
  unique.sort((a, b) => b.length - a.length);
  return unique.slice(0, limit);
}

export interface CategoryVote {
  categoryId: string;
  categoryName: string;
  count: number;
  lastSeen: string; // ISO date
}

export interface Ranked {
  best: CategoryVote | null;
  confidence: "high" | "medium" | "needs_input";
  share: number;
  total: number;
}

/**
 * Rank history matches: high confidence needs >=2 matches and a >=0.7
 * share for one category; any match at all gives medium; none → question.
 */
export function rankVotes(votes: CategoryVote[]): Ranked {
  const total = votes.reduce((s, v) => s + v.count, 0);
  if (total === 0) return { best: null, confidence: "needs_input", share: 0, total };
  const sorted = [...votes].sort(
    (a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen),
  );
  const best = sorted[0];
  const share = best.count / total;
  const confidence = best.count >= 2 && share >= 0.7 ? "high" : "medium";
  return { best, confidence, share, total };
}
