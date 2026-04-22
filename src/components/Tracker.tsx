"use client";

import { useEffect, useState } from "react";
import type { TrackerEvent } from "@/lib/types/tracker";
import { Scanner } from "@/components/Scanner";
import { QuickTrade } from "@/components/QuickTrade";

const POLL_MS = 30_000;

function timeAgo(tsSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - tsSec;
  if (diff < 60) return `${diff}s ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatSol(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n >= 100) return `${n.toFixed(1)} SOL`;
  if (n >= 1) return `${n.toFixed(2)} SOL`;
  return `${n.toFixed(3)} SOL`;
}

function formatUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "—";
  if (n >= 1000) return `~$${Math.round(n).toLocaleString()}`;
  return `~$${n.toFixed(0)}`;
}

function shortMint(mint: string): string {
  if (mint.length <= 10) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

export default function Tracker() {
  const [events, setEvents] = useState<TrackerEvent[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [openScanMint, setOpenScanMint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/wallet-activity?limit=50", { cache: "no-store" });
        if (!res.ok) throw new Error(`GET /api/wallet-activity ${res.status}`);
        const data = (await res.json()) as { events?: TrackerEvent[] };
        if (!cancelled) {
          setEvents(data.events ?? []);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "failed to load tracker");
      }
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (err) {
    return (
      <div className="border border-[#1e4465] bg-[#060e156e] rounded-xl p-6 backdrop-blur-md">
        <h2 className="text-sm uppercase tracking-wider text-[#7fd0ff] mb-2">Smart Wallet Tracker</h2>
        <p className="text-red-400 text-sm">Error: {err}</p>
      </div>
    );
  }

  if (events === null) {
    return (
      <div className="border border-[#1e4465] bg-[#060e156e] rounded-xl p-6 backdrop-blur-md">
        <h2 className="text-sm uppercase tracking-wider text-[#7fd0ff] mb-2">Smart Wallet Tracker</h2>
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="border border-[#1e4465] bg-[#060e156e] rounded-xl p-6 backdrop-blur-md">
        <h2 className="text-sm uppercase tracking-wider text-[#7fd0ff] mb-2">Smart Wallet Tracker</h2>
        <p className="text-gray-400 text-sm">
          Tracker is idle. First swap will land here within a minute.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[#1e4465] bg-[#060e156e] rounded-xl p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm uppercase tracking-wider text-[#7fd0ff]">Smart Wallet Tracker</h2>
        <span className="text-[10px] text-gray-500">{events.length} events</span>
      </div>

      <ul className="space-y-1 text-xs">
        {events.map((ev) => {
          const dirColor = ev.direction === "buy" ? "text-emerald-400" : "text-red-400";
          const label = ev.ticker ? `$${ev.ticker}` : shortMint(ev.mint);
          return (
            <li
              key={ev.signature}
              className="py-1 border-b border-[#1e4465]/30 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-300 w-14 truncate" title={ev.wallet}>
                  {ev.wallet_alias}
                </span>
                <span className={`${dirColor} uppercase w-10`}>{ev.direction}</span>
                <span className="text-white w-20 truncate" title={ev.mint}>
                  {label}
                </span>
                <span className="text-gray-400 w-20 text-right">{formatSol(ev.sol_amount)}</span>
                <span className="text-gray-500 w-16 text-right">{formatUsd(ev.usd_amount)}</span>
                <span className="text-gray-500 flex-1 text-right">{timeAgo(ev.timestamp)}</span>
                <a
                  href={`https://solscan.io/tx/${ev.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-[#7fd0ff]"
                  title="view on Solscan"
                >
                  📎
                </a>
                <button
                  type="button"
                  onClick={() =>
                    setOpenScanMint((prev) =>
                      prev === ev.mint ? null : ev.mint
                    )
                  }
                  className={`text-[10px] uppercase tracking-wider border border-[#1e4465]/40 rounded px-1.5 py-0.5 ${
                    openScanMint === ev.mint
                      ? "text-[#7fd0ff] bg-[#0b1b2a]"
                      : "text-gray-500 hover:text-[#7fd0ff]"
                  }`}
                >
                  {openScanMint === ev.mint ? "close" : "scan"}
                </button>
              </div>
              {openScanMint === ev.mint && (
                <div className="mt-1">
                  <QuickTrade mint={ev.mint} ticker={ev.ticker ?? undefined} className="mb-2" />
                  <Scanner mint={ev.mint} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
