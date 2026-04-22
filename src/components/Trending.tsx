"use client";

import { useEffect, useState } from "react";
import { Scanner } from "@/components/Scanner";
import { QuickTrade } from "@/components/QuickTrade";
import { formatUsdCompact, formatPctSigned, truncateMint } from "@/lib/format";
import type { TrendingApiResponse, TrendingRow, SignalBadge } from "@/lib/types/trending";

const POLL_MS = 60_000;
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

interface BadgeMeta {
  emoji: string;
  label: string;
  cls: string;
  pulse?: boolean;
  tooltip: string;
}

const BADGE_META: Record<SignalBadge, BadgeMeta> = {
  SMART_MONEY: {
    emoji: "🟢",
    label: "SMART MONEY",
    cls: "text-emerald-400 border-emerald-900/60",
    tooltip: "One or more tracked / KOL wallets bought this token in the current window.",
  },
  BUNDLE_RISK: {
    emoji: "💥",
    label: "BUNDLE RISK",
    cls: "text-red-400 border-red-900/60",
    tooltip: "Tight top-holder concentration on a new pair — possible bundled buy / sniper cluster.",
  },
  TOP10_WINNING: {
    emoji: "📈",
    label: "TOP10 WINNING",
    cls: "text-emerald-400 border-emerald-900/60",
    tooltip: "Top-10 holders have low concentration (<30%) — spread looks healthy.",
  },
  TOP10_UNDERWATER: {
    emoji: "📉",
    label: "TOP10 UNDERWATER",
    cls: "text-red-400 border-red-900/60",
    tooltip: "Top-10 holders control ≥60% of supply — concentration risk.",
  },
  TOP10_MIXED: {
    emoji: "〰️",
    label: "TOP10 MIXED",
    cls: "text-amber-400 border-amber-900/60",
    tooltip: "Top-10 holders control 30–60% of supply — mixed signal.",
  },
  NEW_PAIR: {
    emoji: "⚠️",
    label: "NEW PAIR",
    cls: "text-amber-400 border-amber-900/60",
    tooltip: "Pair is less than 4 hours old — unvetted.",
  },
  UNSAFE: {
    emoji: "🚨",
    label: "UNSAFE",
    cls: "text-red-500 border-red-900/80",
    pulse: true,
    tooltip: "Honeypot flag set, or LP is unlocked and top-10 holders control >60%.",
  },
  LOW_VOL: {
    emoji: "⏳",
    label: "LOW VOL",
    cls: "text-gray-400 border-gray-700/60",
    tooltip: "Liquidity under $20K — expect heavy slippage on any size.",
  },
};

function minutesAgo(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m === 1) return "1m ago";
  return `${m}m ago`;
}

function pctClass(p: number | null): string {
  if (p == null || p === 0) return "text-gray-400";
  return p > 0 ? "text-emerald-400" : "text-red-400";
}

function Badge({ badge }: { badge: SignalBadge }) {
  const m = BADGE_META[badge];
  return (
    <span
      title={m.tooltip}
      className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded font-mono ${m.cls} ${m.pulse ? "animate-pulse" : ""}`}
    >
      <span aria-hidden>{m.emoji}</span>
      <span>{m.label}</span>
    </span>
  );
}

interface RowProps {
  row: TrendingRow;
  expanded: boolean;
  onToggle: () => void;
}

function TrendingRowItem({ row, expanded, onToggle }: RowProps) {
  const rankStr = String(row.rank).padStart(2, "0");
  const priceDisplay = formatUsdCompact(row.mcap_usd ?? row.price_usd);
  const priceLabel = row.mcap_usd != null ? "mcap" : "price";
  return (
    <div className="border-t border-[#1e4465]/40">
      {/* Desktop row */}
      <div className="hidden md:grid grid-cols-[32px_minmax(0,1fr)_90px_70px_70px_80px_minmax(140px,1fr)_60px] items-center gap-2 px-4 py-2 hover:bg-[#0b1b2a33]">
        <span className="text-[10px] font-mono text-gray-500">{rankStr}</span>
        <div className="min-w-0">
          <div className="font-bold text-white truncate">{row.ticker}</div>
          <a
            href={`https://dexscreener.com/solana/${row.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-gray-500 hover:text-[#7fd0ff]"
            title={row.mint}
          >
            {truncateMint(row.mint)}
          </a>
        </div>
        <span
          className="text-xs font-mono text-gray-300 text-right"
          title={priceLabel}
        >
          {priceDisplay}
        </span>
        <span className={`text-xs font-mono text-right ${pctClass(row.pct_change_1h)}`}>
          {row.pct_change_1h != null ? formatPctSigned(row.pct_change_1h) : "—"}
        </span>
        <span className={`text-xs font-mono text-right ${pctClass(row.pct_change_24h)}`}>
          {row.pct_change_24h != null ? formatPctSigned(row.pct_change_24h) : "—"}
        </span>
        <span className="text-xs font-mono text-gray-400 text-right">
          {formatUsdCompact(row.liquidity_usd)}
        </span>
        <div className="flex flex-wrap gap-1 min-w-0">
          {row.badges.map((b) => (
            <Badge key={b} badge={b} />
          ))}
        </div>
        <div className="flex justify-end items-center gap-1">
          <span className="hidden lg:inline-flex">
            <QuickTrade mint={row.mint} ticker={row.ticker.replace(/^\$/, "")} />
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] uppercase tracking-wider border border-[#1e4465]/60 rounded px-2 py-0.5 text-gray-400 hover:text-[#7fd0ff] hover:border-[#7fd0ff]/50 font-mono"
            aria-expanded={expanded}
          >
            {expanded ? "hide" : "scan"}
          </button>
        </div>
      </div>

      {/* Mobile row */}
      <div className="md:hidden px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-gray-500">{rankStr}</span>
          <span className="font-bold text-white truncate flex-1 min-w-0">{row.ticker}</span>
          <button
            type="button"
            onClick={onToggle}
            className="text-[10px] uppercase tracking-wider border border-[#1e4465]/60 rounded px-2 py-0.5 text-gray-400 font-mono"
            aria-expanded={expanded}
          >
            {expanded ? "hide" : "scan"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {row.badges.map((b) => (
            <Badge key={b} badge={b} />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-gray-400">
          <span>{priceDisplay}</span>
          <span className={pctClass(row.pct_change_1h)}>
            {row.pct_change_1h != null ? formatPctSigned(row.pct_change_1h) : "—"}
          </span>
          <span className={pctClass(row.pct_change_24h)}>
            {row.pct_change_24h != null ? formatPctSigned(row.pct_change_24h) : "—"}
          </span>
          <span>{formatUsdCompact(row.liquidity_usd)}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#1e4465]/40 bg-[#0b1b2a22] px-4 py-3 space-y-2">
          <div className="lg:hidden">
            <QuickTrade mint={row.mint} ticker={row.ticker.replace(/^\$/, "")} />
          </div>
          <Scanner mint={row.mint} />
        </div>
      )}
    </div>
  );
}

export function Trending() {
  const [data, setData] = useState<TrendingApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedMint, setExpandedMint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/trending", { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = (await res.json()) as TrendingApiResponse;
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "fetch failed");
      }
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const rows = data?.rows ?? [];
  const stale_ms = data?.stale_ms ?? null;
  const isStale = stale_ms != null && stale_ms > STALE_THRESHOLD_MS;

  const freshnessText =
    stale_ms == null
      ? "awaiting first tick"
      : `updated ${minutesAgo(stale_ms)}${isStale ? " — may be stale" : ""}`;
  const freshnessClass = isStale ? "text-amber-400" : "text-gray-500";

  return (
    <section className="border border-[#1e4465] bg-[#060e156e] rounded-xl backdrop-blur-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-sm uppercase tracking-wider text-[#7fd0ff]">TRENDING NOW</h2>
        <span className={`text-[10px] font-mono ${freshnessClass}`}>{freshnessText}</span>
      </div>

      {error ? (
        <div className="border-t border-[#1e4465]/40 px-4 py-6 text-xs text-red-400">
          Trending feed choked. Cron will retry on the next tick (≤5 min). Check <code>/book</code> in the meantime.
        </div>
      ) : rows.length === 0 ? (
        <div className="border-t border-[#1e4465]/40 px-4 py-8 text-center">
          <div className="text-sm text-gray-300">Still cooking.</div>
          <div className="text-xs text-gray-500 mt-1">
            The aggregator rolls every 5 minutes. Come back in a bit — fresh signal is on the way.
          </div>
        </div>
      ) : (
        rows.map((row) => (
          <TrendingRowItem
            key={row.mint}
            row={row}
            expanded={expandedMint === row.mint}
            onToggle={() => setExpandedMint((m) => (m === row.mint ? null : row.mint))}
          />
        ))
      )}
    </section>
  );
}

export default Trending;
