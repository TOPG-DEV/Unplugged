// Shared formatting helpers — single source of truth so Wire, Book,
// Tracker, and future Phase 3 Quick Trade / Trending surfaces all
// render numbers the same way.

/**
 * Compact USD formatter for display values that can span 10 orders of
 * magnitude (tiny token price $0.0000042 ... to multi-billion market cap).
 *
 * Examples:
 *   420_000_000 → "$420M"
 *   135_000     → "$135K"
 *   42          → "$42"
 *   0.42        → "$0.42"
 *   0.0000042   → "$4.2e-6"
 *   null / NaN  → "—"
 */
export function formatUsdCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  if (n >= 0.0001) return `$${n.toPrecision(3)}`;
  return `$${n.toExponential(1)}`;
}

/**
 * Compact mint display: first 4 + ellipsis + last 4 chars. Assumes
 * input is already a base58 SPL mint pubkey; callers who need to
 * render arbitrary user input should sanitize separately.
 */
export function truncateMint(mint: string, head = 4, tail = 4): string {
  if (!mint) return "";
  if (mint.length <= head + tail + 1) return mint;
  return `${mint.slice(0, head)}…${mint.slice(-tail)}`;
}

/**
 * Format a 0..1 decimal as a signed percent string. 0.42 → "+42.0%",
 * -0.15 → "-15.0%", 0 → "0.0%".
 */
export function formatPctSigned(pct: number, digits = 1): string {
  if (!Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${(pct * 100).toFixed(digits)}%`;
}

/**
 * Compact SOL amount formatter with 3-tier precision.
 * Matches the inline formatSol() pattern used in Tracker.tsx.
 *
 *   245.7 → "245.7"    (>=100 uses 1 decimal)
 *   12.34 → "12.34"    (>=1 uses 2 decimals)
 *   0.125 → "0.125"    (<1 uses 3 decimals)
 *   0      → "0"
 *   null/NaN → "—"
 */
export function formatSolAmount(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs >= 100) return n.toFixed(1);
  if (abs >= 1) return n.toFixed(2);
  return n.toFixed(3);
}

/**
 * head…tail truncation for base58 transaction signatures.
 * Defaults head=6, tail=6 (sigs are recognized differently from mints; UI-SPEC §Formatter Contract).
 */
export function formatTxSignature(sig: string, head = 6, tail = 6): string {
  if (!sig) return "";
  if (sig.length <= head + tail + 1) return sig;
  return `${sig.slice(0, head)}…${sig.slice(-tail)}`;
}
