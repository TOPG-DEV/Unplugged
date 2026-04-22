// Shared types for the KC call feed (WIRE-01).
// See .planning/phases/02-wire-tools/02-CONTEXT.md D-01..D-05 and
// .planning/phases/02.1-mcap-pivot/02.1-PLAN.md for the price → mcap pivot.
//
// Call values are stored as USD market cap at post/close time, not
// per-token price. Mcap-native matches Solana memecoin call culture
// ("called at $135K mcap") and makes displays readable by default.

export type CallStatus =
  | "open"
  | "closed-win"
  | "closed-loss"
  | "stopped-out"
  | "closed-retracted";

export interface CallBody {
  ticker: string; // e.g. "WIF"
  mint: string; // SPL mint pubkey
  thesis: string; // free text, 3–500 chars
  entry_mcap: number; // USD market cap at post time
  target_mcap: number; // USD market cap target
  stop_mcap: number | null; // optional stop mcap
  timestamp_ms: number; // unix ms at post time
}

export interface StatusChange {
  status: CallStatus;
  timestamp_ms: number;
  signature: string; // bs58 — signed { call_id, status, timestamp_ms }
  close_mcap?: number; // USD market cap at close time (for non-open statuses)
}

export interface CallDoc extends CallBody {
  _id: string; // Mongo _id as string (hex ObjectId)
  signature: string; // bs58 — signs CallBody canonicalJSON
  pubkey: string; // KC Call pubkey (base58) for signature verification
  status: CallStatus;
  status_history: StatusChange[];
  created_at: Date;
  updated_at: Date;
}

// Canonical alphabetical field order — used by canonicalJSON for deterministic
// signature payloads. DO NOT reorder without bumping a versioning scheme.
export const CALL_FIELDS: (keyof CallBody)[] = [
  "entry_mcap",
  "mint",
  "stop_mcap",
  "target_mcap",
  "thesis",
  "ticker",
  "timestamp_ms",
];
