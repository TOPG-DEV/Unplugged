// Shared types for Smart Wallet Tracker (TRACK-01).
// See .planning/phases/02-wire-tools/02-CONTEXT.md D-06..D-08.

export interface TrackedWallet {
  alias: string;
  pubkey: string;
}

export type SwapDirection = "buy" | "sell";

export interface TrackerEvent {
  signature: string;
  wallet: string;
  wallet_alias: string;
  direction: SwapDirection;
  mint: string;
  ticker: string | null;
  sol_amount: number;
  usd_amount: number | null;
  source: string;
  timestamp: number;
  ingested_at: Date;
}
