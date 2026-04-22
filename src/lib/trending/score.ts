import type { TrendingBucket } from "@/lib/types/trending";

export interface CandidateScore {
  mint: string;
  score: number;
  bucket_volume_sol: number;   // last-bucket buy volume (tiebreak)
  unique_buyers_1h: number;
  acceleration: number;
  smart_money_aliases: string[];
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * buckets is the full bucket history for ONE mint, most-recent-first, up to 17 entries:
 *   buckets[0]       = current window (last 15 min)
 *   buckets[1..16]   = prior 16 baseline windows (4h)
 *
 * Returns null if too few baseline buckets (< 4) — mint is too new to trend-score.
 */
export function scoreCandidate(buckets: TrendingBucket[]): CandidateScore | null {
  if (buckets.length === 0) return null;
  const current = buckets[0];
  const baseline = buckets.slice(1, 17);
  if (baseline.length < 4) return null;  // need minimum history

  const baselineMedian = median(baseline.map((b) => b.buy_sol_total));
  // Avoid divide-by-zero: if baseline is 0, treat any current volume as "infinite acceleration"
  // but cap at a finite number so JSON serializes cleanly.
  const acceleration = baselineMedian === 0
    ? (current.buy_sol_total > 0 ? 1000 : 0)
    : current.buy_sol_total / baselineMedian;

  // Unique buyers in the last 1h = union across last 4 buckets (15min × 4).
  const last1h = buckets.slice(0, 4);
  const buyers = new Set<string>();
  const smartAliases = new Set<string>();
  for (const b of last1h) {
    for (const u of b.unique_buyers) buyers.add(u);
    for (const s of b.smart_money_hits) smartAliases.add(s);
  }

  return {
    mint: current.mint,
    score: acceleration * buyers.size,
    bucket_volume_sol: current.buy_sol_total,
    unique_buyers_1h: buyers.size,
    acceleration,
    smart_money_aliases: [...smartAliases],
  };
}

/**
 * Rank candidates highest score first, tiebreak on absolute bucket volume per AI-01 requirement.
 * Returns top N (default 10).
 */
export function rankCandidates(scores: CandidateScore[], topN = 10): CandidateScore[] {
  return [...scores]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.bucket_volume_sol - a.bucket_volume_sol;
    })
    .slice(0, topN);
}
