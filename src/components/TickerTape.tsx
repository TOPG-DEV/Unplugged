"use client";

import { useEffect, useState } from "react";
import type { TrendingApiResponse, TrendingRow } from "@/lib/types/trending";
import { formatUsdCompact, formatPctSigned } from "@/lib/format";

const POLL_MS = 60_000;

// Manifesto lines shown when there's no live trending data + interleaved
// between real ticker cells when data exists. On-brand filler beats empty "—".
const MANIFESTO = [
  "UNPLUGGED // PROTOCOL",
  "STEP OUT OF THE CIRCLE",
  "NO SOCKPUPPETS",
  "CARELESS · EMOTIONLESS · STILL PLAYING",
  "REAL FLOW OVER NOISE",
  "OPERATORS ONLY",
  "SIGNED CALLS OR SILENCE",
  "TUNE OUT THE MAINSTREAM",
];

interface Item {
  kind: "ticker" | "manifesto";
  ticker?: string;
  price?: string;
  change?: number | null;
  line?: string;
}

function TickerCell({ ticker, price, change }: { ticker: string; price: string; change: number | null }) {
  const tone =
    change == null || change === 0
      ? "text-gray-400"
      : change > 0
        ? "text-emerald-400"
        : "text-red-400";
  return (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 whitespace-nowrap border-r border-[#1e4465]/40">
      <span className="text-[11px] font-mono text-white tracking-tight">{ticker}</span>
      <span className="text-[11px] font-mono text-gray-400">{price}</span>
      {change != null && (
        <span className={`text-[11px] font-mono ${tone}`}>{formatPctSigned(change)}</span>
      )}
    </span>
  );
}

function ManifestoCell({ line }: { line: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-6 py-1.5 whitespace-nowrap border-r border-[#1e4465]/40">
      <span className="text-[10px] text-[#7fd0ff]/70 uppercase tracking-[0.25em] font-semibold">
        {line}
      </span>
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

  // Build the display sequence:
  // - When trending data exists: interleave a manifesto line every 3 tickers
  // - When empty: just rotate through manifesto lines
  const items: Item[] = [];
  if (rows.length > 0) {
    rows.forEach((r, i) => {
      items.push({
        kind: "ticker",
        ticker: r.ticker,
        price: formatUsdCompact(r.mcap_usd ?? r.price_usd),
        change: r.pct_change_1h,
      });
      if ((i + 1) % 3 === 0) {
        items.push({ kind: "manifesto", line: MANIFESTO[i % MANIFESTO.length] });
      }
    });
  } else {
    MANIFESTO.forEach((line) => items.push({ kind: "manifesto", line }));
  }

  const loop = [...items, ...items];

  return (
    <div className="border-b border-[#1e4465] bg-[#05080c]/90 backdrop-blur-md overflow-hidden relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-black to-transparent z-10" />
      <div className="ticker-track flex w-max">
        {loop.map((it, i) =>
          it.kind === "ticker" ? (
            <TickerCell
              key={`t-${it.ticker}-${i}`}
              ticker={it.ticker!}
              price={it.price!}
              change={it.change ?? null}
            />
          ) : (
            <ManifestoCell key={`m-${it.line}-${i}`} line={it.line!} />
          )
        )}
      </div>
    </div>
  );
}

export default TickerTape;
