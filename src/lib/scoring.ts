// Per-call PnL math.
// Mcap-native (Plan 02.1): both `callPnL` params and the close-of lookup
// operate on USD market cap values — mathematically identical to price PnL
// for a fixed-supply token, but display semantics match Solana call culture.

import type { CallDoc } from "@/lib/types/call";

/**
 * Returns PnL as a decimal.  0.42 = +42%.  -0.15 = -15%.
 * Returns 0 if entry is zero or negative, or if current is not finite.
 * Works equally for mcap deltas and price deltas — % is identical.
 */
export function callPnL(entry: number, current: number): number {
  if (entry <= 0 || !Number.isFinite(current)) return 0;
  return (current - entry) / entry;
}

export interface BookStats {
  total: number;
  winRate: number; // 0..1, of CLOSED calls (closed-win / (closed-win + closed-loss + stopped-out))
  avgPnL: number; // decimal, averaged over closed calls with a recorded close_mcap
  openCount: number;
}

function closeMcapOf(call: CallDoc): number | null {
  const closes = call.status_history
    .filter((s) => s.close_mcap != null)
    .slice(-1);
  return closes.length ? (closes[0].close_mcap ?? null) : null;
}

export function bookStats(calls: CallDoc[]): BookStats {
  const total = calls.length;
  const open = calls.filter((c) => c.status === "open").length;
  const closed = calls.filter(
    (c) =>
      c.status === "closed-win" ||
      c.status === "closed-loss" ||
      c.status === "stopped-out"
  );
  const wins = closed.filter((c) => c.status === "closed-win").length;
  const pnls = closed
    .map((c) => {
      const close = closeMcapOf(c);
      return close != null ? callPnL(c.entry_mcap, close) : null;
    })
    .filter((x): x is number => x != null);

  return {
    total,
    winRate: closed.length ? wins / closed.length : 0,
    avgPnL: pnls.length ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0,
    openCount: open,
  };
}
