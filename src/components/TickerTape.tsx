"use client";

import { useEffect, useState } from "react";
import type { TrendingApiResponse } from "@/lib/types/trending";
import { formatUsdCompact, formatPctSigned } from "@/lib/format";

const POLL_MS = 60_000;

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

interface HotTokenRow {
  ticker: string;
  mint: string;
  price_usd: number | null;
  mcap_usd: number | null;
  change_1h: number | null;
  change_24h: number | null;
  volume_24h_usd: number | null;
}

interface HotResponse {
  rows: HotTokenRow[];
}

interface Cell {
  kind: "ticker" | "manifesto";
  ticker?: string;
  price?: string;
  change?: number | null;
  line?: string;
}

function TickerCell({ ticker, price, change }: { ticker: string; price: string; change: number | null }) {
  const tone =
    change == null || change === 0
      ? "text-white/50"
      : change > 0
        ? "text-emerald-400"
        : "text-red-400";
  return (
    <span className="inline-flex items-center gap-2 px-4 py-1.5 whitespace-nowrap border-r border-white/10">
      <span className="text-[11px] font-mono text-white tracking-tight">${ticker}</span>
      <span className="text-[11px] font-mono text-white/60">{price}</span>
      {change != null && (
        <span className={`text-[11px] font-mono ${tone}`}>{formatPctSigned(change)}</span>
      )}
    </span>
  );
}

function ManifestoCell({ line }: { line: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-6 py-1.5 whitespace-nowrap border-r border-white/10">
      <span className="text-[10px] text-white/40 uppercase tracking-[0.28em] font-semibold">
        {line}
      </span>
    </span>
  );
}

export function TickerTape() {
  const [hot, setHot] = useState<HotTokenRow[]>([]);
  const [trendingRows, setTrendingRows] = useState<Array<{ ticker: string; price: string; change: number | null }>>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadHot() {
      try {
        const res = await fetch("/api/hot-tokens", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as HotResponse;
        if (!cancelled && Array.isArray(body.rows)) setHot(body.rows);
      } catch {
        // ignore
      }
    }

    async function loadTrending() {
      try {
        const res = await fetch("/api/trending", { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as TrendingApiResponse;
        if (!cancelled && Array.isArray(body.rows)) {
          setTrendingRows(
            body.rows.map((r) => ({
              ticker: r.ticker.replace(/^\$/, ""),
              price: formatUsdCompact(r.mcap_usd ?? r.price_usd),
              change: r.pct_change_1h,
            }))
          );
        }
      } catch {
        // ignore
      }
    }

    loadHot();
    loadTrending();
    const id1 = setInterval(loadHot, POLL_MS);
    const id2 = setInterval(loadTrending, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(id1);
      clearInterval(id2);
    };
  }, []);

  // Build sequence:
  //   [hot token] × N  →  one manifesto  →  [trending row] × M  →  one manifesto  → repeat
  const cells: Cell[] = [];

  hot.forEach((r, i) => {
    cells.push({
      kind: "ticker",
      ticker: r.ticker,
      // Mcap-first per brand direction; price as last-resort fallback only
      price: formatUsdCompact(r.mcap_usd ?? r.price_usd),
      change: r.change_24h ?? r.change_1h,
    });
    if ((i + 1) % 3 === 0) {
      cells.push({ kind: "manifesto", line: MANIFESTO[i % MANIFESTO.length] });
    }
  });

  if (trendingRows.length > 0) {
    cells.push({ kind: "manifesto", line: "— UNPLUGGED TRENDING —" });
    trendingRows.forEach((r, i) => {
      cells.push({ kind: "ticker", ticker: r.ticker, price: r.price, change: r.change });
      if ((i + 1) % 3 === 0) cells.push({ kind: "manifesto", line: MANIFESTO[(i + 1) % MANIFESTO.length] });
    });
  }

  // Fallback — if both feeds are empty, show just manifesto lines
  if (cells.length === 0) {
    MANIFESTO.forEach((line) => cells.push({ kind: "manifesto", line }));
  }

  const loop = [...cells, ...cells];

  return (
    <div className="relative z-30 border-b border-white/10 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black to-transparent z-10" />
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
