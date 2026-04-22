// Scanner types — 4-light readout data shapes for /api/scan/:mint.
// See Plan 02-03 and 02-RESEARCH.md (DexScreener + Rugcheck sections).

export type Light = "green" | "yellow" | "red" | "unknown";

export interface DexScreenerData {
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  pairAgeMs: number | null;
  priceChange1h: number | null;
  priceChange24h: number | null;
}

export interface RugcheckData {
  mintRenounced: boolean | null;
  lpLocked: Light;
  top10HolderPct: number | null;
  honeypotFlag: boolean | null;
  risks: Array<{ name: string; level: "warn" | "danger" }>;
}

export interface ScanResult {
  mint: string;
  dexscreener: DexScreenerData | null; // null if fetch failed
  rugcheck: RugcheckData | null;
  cached_at: string; // ISO
  sources: { dexscreener: "ok" | "error"; rugcheck: "ok" | "error" };
}
