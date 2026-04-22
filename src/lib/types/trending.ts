export type SignalBadge =
  | "SMART_MONEY"
  | "BUNDLE_RISK"
  | "TOP10_WINNING"
  | "TOP10_UNDERWATER"
  | "TOP10_MIXED"
  | "NEW_PAIR"
  | "UNSAFE"
  | "LOW_VOL";

// Priority order for max-3-badges rule (UI-SPEC §Badge Glossary).
// Higher index = higher priority.
export const BADGE_PRIORITY: Record<SignalBadge, number> = {
  UNSAFE: 7,
  BUNDLE_RISK: 6,
  SMART_MONEY: 5,
  TOP10_WINNING: 4,
  TOP10_UNDERWATER: 4,
  TOP10_MIXED: 4,
  NEW_PAIR: 3,
  LOW_VOL: 2,
};

export interface TrendingBucket {
  _id?: unknown;              // Mongo ObjectId
  mint: string;
  bucket_start: Date;         // floor(timestamp_ms / 900_000) * 900_000, as Date
  buy_sol_total: number;
  sell_sol_total: number;
  unique_buyers: string[];    // tokenOutputs[].userAccount pubkeys seen buying in this bucket
  smart_money_hits: string[]; // aliases (not pubkeys — dedupe on human identity per Pitfall AI-6)
  tx_count: number;
  created_at: Date;           // TTL anchor — index expireAfterSeconds: 14400 (4h)
}

export interface TrendingRow {
  mint: string;
  ticker: string;             // "$WIF" / "$BONK" — from DexScreener pair baseToken.symbol
  price_usd: number | null;
  mcap_usd: number | null;    // present when DexScreener supplies fdv/marketCap — UI adapts label
  liquidity_usd: number | null;
  pct_change_1h: number | null;  // 0..1 signed decimal; formatPctSigned() renders
  pct_change_24h: number | null;
  bucket_volume_sol: number;  // raw window volume (last 15-min bucket) — D-05
  unique_buyers_1h: number;   // count in last 4 buckets — D-05
  score: number;              // composite: acceleration × unique_buyers
  rank: number;               // 1..10
  badges: SignalBadge[];      // pre-filtered to max 3, priority-ordered
  smart_money_hits: string[]; // aliases for tooltip detail
  pair_age_ms: number | null; // DexScreener pairCreatedAt → now; null if unknown
  top_holder_pnl_label: "winning" | "underwater" | "mixed" | null; // UI-SPEC TOP10 * rule
}

export interface TrendingSnapshot {
  _id: "current";             // single-doc upsert key
  generated_at: Date;
  rows: TrendingRow[];        // length <= 10
  source_window_ms: number;   // 15 * 60_000; exposed so UI can show "last 15m"
  baseline_window_ms: number; // 4 * 60 * 60_000; same
}

export interface TrendingApiResponse {
  generated_at: string;       // ISO string over the wire
  rows: TrendingRow[];
  stale_ms: number;           // now - generated_at, for UI amber threshold
}
