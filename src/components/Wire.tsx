"use client";

import { useEffect, useState } from "react";
import type { CallDoc } from "@/lib/types/call";
import { callPnL } from "@/lib/scoring";
import { Scanner } from "@/components/Scanner";
import { QuickTrade } from "@/components/QuickTrade";
import { formatUsdCompact, truncateMint, formatPctSigned } from "@/lib/format";

const MCAP_POLL_MS = 30_000;

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function lastCloseMcap(call: CallDoc): number | null {
  for (let i = call.status_history.length - 1; i >= 0; i--) {
    const c = call.status_history[i].close_mcap;
    if (typeof c === "number" && c > 0) return c;
  }
  return null;
}

function statusBadge(status: CallDoc["status"]) {
  const map: Record<CallDoc["status"], { label: string; cls: string }> = {
    open: { label: "OPEN", cls: "text-[#7fd0ff] border-[#1e4465]" },
    "closed-win": { label: "WIN", cls: "text-emerald-400 border-emerald-900" },
    "closed-loss": { label: "LOSS", cls: "text-red-400 border-red-900" },
    "stopped-out": { label: "STOP", cls: "text-amber-400 border-amber-900" },
    "closed-retracted": { label: "RETRACTED", cls: "text-gray-400 border-gray-700" },
  };
  const m = map[status];
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded ${m.cls}`}>
      {m.label}
    </span>
  );
}

export default function Wire() {
  const [calls, setCalls] = useState<CallDoc[] | null>(null);
  const [mcaps, setMcaps] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);
  const [openScanMint, setOpenScanMint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCalls() {
      try {
        const res = await fetch("/api/calls?limit=10", { cache: "no-store" });
        if (!res.ok) throw new Error(`GET /api/calls ${res.status}`);
        const data = (await res.json()) as { calls?: CallDoc[] };
        if (!cancelled) setCalls(Array.isArray(data.calls) ? data.calls : []);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "failed to load calls");
      }
    }
    loadCalls();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!calls || calls.length === 0) return;
    const openMints = Array.from(
      new Set(calls.filter((c) => c.status === "open").map((c) => c.mint))
    );
    if (openMints.length === 0) return;

    let cancelled = false;
    async function pollMcaps() {
      try {
        const url = `/api/call-mcaps?mints=${encodeURIComponent(openMints.join(","))}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { mcaps?: Record<string, number> };
        if (!cancelled && data.mcaps) setMcaps((prev) => ({ ...prev, ...data.mcaps }));
      } catch {
        // swallow — next tick retries
      }
    }
    pollMcaps();
    const id = setInterval(pollMcaps, MCAP_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [calls]);

  if (err) {
    return (
      <div className="border border-[#1e4465] bg-[#060e156e] rounded-xl p-6 backdrop-blur-md">
        <h2 className="text-sm uppercase tracking-wider text-[#7fd0ff] mb-2">The Wire</h2>
        <p className="text-red-400 text-sm">Error: {err}</p>
      </div>
    );
  }

  if (calls === null) {
    return (
      <div className="border border-[#1e4465] bg-[#060e156e] rounded-xl p-6 backdrop-blur-md">
        <h2 className="text-sm uppercase tracking-wider text-[#7fd0ff] mb-2">The Wire</h2>
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="border border-[#1e4465] bg-[#060e156e] rounded-xl p-6 backdrop-blur-md">
        <h2 className="text-sm uppercase tracking-wider text-[#7fd0ff] mb-2">The Wire</h2>
        <p className="text-gray-400 text-sm">No calls yet. The first will land here.</p>
      </div>
    );
  }

  return (
    <div className="border border-[#1e4465] bg-[#060e156e] rounded-xl p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm uppercase tracking-wider text-[#7fd0ff]">The Wire</h2>
        <a href="/book" className="text-xs text-[#7fd0ff] hover:underline">
          View all →
        </a>
      </div>

      <ul className="space-y-3">
        {calls.map((c) => {
          const isOpen = c.status === "open";
          const current = isOpen ? mcaps[c.mint] : lastCloseMcap(c);
          const pnl = current != null ? callPnL(c.entry_mcap, current) : null;
          const pnlColor =
            pnl == null
              ? "text-gray-400"
              : pnl > 0
                ? "text-emerald-400"
                : pnl < 0
                  ? "text-red-400"
                  : "text-gray-300";
          return (
            <li
              key={c._id}
              className="border border-[#1e4465]/60 rounded-lg p-3 bg-black/30"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{c.ticker}</span>
                  {statusBadge(c.status)}
                </div>
                <span className="text-[10px] text-gray-500">{relativeTime(c.timestamp_ms)}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <a
                  href={`https://dexscreener.com/solana/${c.mint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono text-gray-500 hover:text-[#7fd0ff]"
                  title={c.mint}
                >
                  {truncateMint(c.mint)}
                </a>
              </div>
              <p className="text-xs text-gray-300 mb-2 line-clamp-1">{c.thesis}</p>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-gray-400">
                  <span>entry {formatUsdCompact(c.entry_mcap)} mcap</span>
                  <span>→</span>
                  <span>{formatUsdCompact(current)}</span>
                  <span className={pnlColor}>{pnl != null ? formatPctSigned(pnl) : "…"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {c.status === "open" && <QuickTrade mint={c.mint} ticker={c.ticker} />}
                  <button
                    type="button"
                    className={`text-[10px] uppercase tracking-wider border border-[#1e4465]/60 rounded px-2 py-0.5 ${
                      openScanMint === c.mint
                        ? "text-[#7fd0ff] bg-[#0b1b2a]"
                        : "text-gray-500 hover:text-[#7fd0ff]"
                    }`}
                    onClick={() =>
                      setOpenScanMint((prev) =>
                        prev === c.mint ? null : c.mint
                      )
                    }
                  >
                    {openScanMint === c.mint ? "close" : "scan"}
                  </button>
                </div>
              </div>
              {openScanMint === c.mint && <Scanner mint={c.mint} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
