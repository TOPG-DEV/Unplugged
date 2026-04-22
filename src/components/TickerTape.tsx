"use client";

import { useEffect, useState } from "react";
import type { TrendingApiResponse, TrendingRow } from "@/lib/types/trending";
import { formatUsdCompact, formatPctSigned } from "@/lib/format";

const POLL_MS = 60_000;

// Placeholder rows rendered before first /api/trending response so the
// marquee never looks empty on cold page load.
const PLACEHOLDER: Pick<TrendingRow, "ticker" | "pct_change_1h">[] = [
  { ticker: "$SOL", pct_change_1h: null },
  { ticker: "$BONK", pct_change_1h: null },
  { ticker: "$WIF", pct_change_1h: null },
  { ticker: "$PEPE", pct_change_1h: null },
  { ticker: "$MOG", pct_change_1h: null },
  { ticker: "$TRUMP", pct_change_1h: null },
];

function Cell({ ticker, price, change }: { ticker: string; price: string; change: number | null }) {
  const tone =
    change == null || change === 0
      ? "text-gray-400"
      : change > 0
        ? "text-emerald-400"
        : "text-red-400";
  return (
    <span className="inline-flex items-center gap-2 px-4 py-1 whitespace-nowrap border-r border-[#1e4465]/40">
      <span className="text-[11px] font-mono text-white">{ticker}</span>
      <span className="text-[11px] font-mono text-gray-400">{price}</span>
      {change != null && (
        <span className={`text-[11px] font-mono ${tone}`}>{formatPctSigned(change)}</span>
      )}
    </span>
  );
}

export function TickerTape() {
  const [rows, setRows] = useState<TrendingRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/trending", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as TrendingApiResponse;
        if (!cancelled && Array.isArray(body.rows)) setRows(body.rows);
      } catch {
        // keep last state
      }
    }
    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const items =
    rows.length > 0
      ? rows.map((r) => ({
          ticker: r.ticker,
          price: formatUsdCompact(r.mcap_usd ?? r.price_usd),
          change: r.pct_change_1h,
        }))
      : PLACEHOLDER.map((p) => ({ ticker: p.ticker, price: "—", change: null }));

  // Duplicate list so the CSS `translateX(-50%)` keyframe creates a seamless loop.
  const loop = [...items, ...items];

  return (
    <div className="border-b border-[#1e4465] bg-[#05080c]/90 backdrop-blur-md overflow-hidden relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black to-transparent z-10" />
      <div className="ticker-track flex w-max">
        {loop.map((it, i) => (
          <Cell key={`${it.ticker}-${i}`} ticker={it.ticker} price={it.price} change={it.change} />
        ))}
      </div>
    </div>
  );
}

export default TickerTape;
