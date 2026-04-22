"use client";

// The Book — public track-record surface.
// Fetches every call, computes aggregate stats client-side, polls live
// prices for open calls every 30s, and lets members inline-scan any mint.

import { useEffect, useMemo, useState } from "react";
import type { CallDoc } from "@/lib/types/call";
import { callPnL, bookStats } from "@/lib/scoring";
import { Scanner } from "@/components/Scanner";
import { QuickTrade } from "@/components/QuickTrade";
import { formatUsdCompact, truncateMint, formatPctSigned } from "@/lib/format";

const MCAP_POLL_MS = 30_000;

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
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
    "closed-retracted": {
      label: "RETRACTED",
      cls: "text-gray-400 border-gray-700",
    },
  };
  const m = map[status];
  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-2 py-0.5 border rounded ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

export default function BookPage() {
  const [calls, setCalls] = useState<CallDoc[] | null>(null);
  const [mcaps, setMcaps] = useState<Record<string, number>>({});
  const [err, setErr] = useState<string | null>(null);
  const [openScanId, setOpenScanId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/calls?limit=200", { cache: "no-store" });
        if (!res.ok) throw new Error(`GET /api/calls ${res.status}`);
        const data = (await res.json()) as { calls?: CallDoc[] };
        if (!cancelled) setCalls(Array.isArray(data.calls) ? data.calls : []);
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "failed to load calls");
      }
    })();
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
        if (!cancelled && data.mcaps)
          setMcaps((prev) => ({ ...prev, ...data.mcaps }));
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

  const stats = useMemo(() => (calls ? bookStats(calls) : null), [calls]);

  if (err) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-xs uppercase tracking-wider text-[#7fd0ff] mb-4">
          The Book
        </h1>
        <p className="text-red-400 text-sm">Error: {err}</p>
      </main>
    );
  }

  if (calls === null) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-xs uppercase tracking-wider text-[#7fd0ff] mb-4">
          The Book
        </h1>
        <p className="text-gray-400 text-sm">Loading…</p>
      </main>
    );
  }

  if (calls.length === 0) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-xs uppercase tracking-wider text-[#7fd0ff] mb-4">
          The Book
        </h1>
        <p className="text-gray-400 text-sm">
          The Book is empty. Post your first call at{" "}
          <a
            href="/admin/new-call"
            className="text-[#7fd0ff] hover:underline"
          >
            /admin/new-call
          </a>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-xs uppercase tracking-wider text-[#7fd0ff] mb-2">
        The Book
      </h1>

      {stats && (
        <header className="border border-[#1e4465] bg-[#060e156e] rounded-xl px-5 py-4 mb-6 backdrop-blur-md">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 font-mono">
            <div>
              <span className="text-2xl text-white">{stats.total}</span>
              <span className="ml-1 text-xs text-gray-400">calls</span>
            </div>
            <span className="text-gray-600">·</span>
            <div>
              <span className="text-2xl text-white">
                {(stats.winRate * 100).toFixed(0)}%
              </span>
              <span className="ml-1 text-xs text-gray-400">W</span>
            </div>
            <span className="text-gray-600">·</span>
            <div>
              <span
                className={`text-2xl ${
                  stats.avgPnL > 0
                    ? "text-emerald-400"
                    : stats.avgPnL < 0
                      ? "text-red-400"
                      : "text-white"
                }`}
              >
                avg {formatPctSigned(stats.avgPnL, 0)}
              </span>
            </div>
            <span className="text-gray-600">·</span>
            <div>
              <span className="text-xs text-gray-400">open: </span>
              <span className="text-2xl text-white">{stats.openCount}</span>
            </div>
          </div>
        </header>
      )}

      <div className="border border-[#1e4465] bg-[#060e156e] rounded-xl backdrop-blur-md overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_80px_90px_90px_80px_60px_60px] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-gray-400 border-b border-[#1e4465] sticky top-0 bg-[#060e15f0] backdrop-blur-md z-10">
          <div>Ticker</div>
          <div>Status</div>
          <div className="text-right">Entry</div>
          <div className="text-right">Current</div>
          <div className="text-right">PnL</div>
          <div className="text-right">Age</div>
          <div className="text-right">Scan</div>
        </div>

        <ul>
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
            const scanOpen = openScanId === c._id;
            return (
              <li
                key={c._id}
                className="border-b border-[#1e4465]/40 last:border-b-0"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_80px_90px_90px_80px_60px_60px] gap-2 px-4 py-2 items-center text-xs">
                  <div className="min-w-0 flex flex-col">
                    <span className="font-bold text-white truncate">{c.ticker}</span>
                    <a
                      href={`https://dexscreener.com/solana/${c.mint}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-gray-500 hover:text-[#7fd0ff] truncate"
                      title={c.mint}
                    >
                      {truncateMint(c.mint)}
                    </a>
                  </div>
                  <div>{statusBadge(c.status)}</div>
                  <div className="text-right text-gray-300">
                    {formatUsdCompact(c.entry_mcap)}
                  </div>
                  <div className="text-right text-gray-300">
                    {formatUsdCompact(current)}
                  </div>
                  <div className={`text-right ${pnlColor}`}>
                    {pnl != null ? formatPctSigned(pnl) : "…"}
                  </div>
                  <div className="text-right text-gray-500">
                    {relativeTime(c.timestamp_ms)}
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      className={`text-[10px] uppercase tracking-wider border border-[#1e4465]/60 rounded px-2 py-0.5 ${
                        scanOpen
                          ? "text-[#7fd0ff] bg-[#0b1b2a]"
                          : "text-gray-500 hover:text-[#7fd0ff]"
                      }`}
                      onClick={() =>
                        setOpenScanId((prev) =>
                          prev === c._id ? null : c._id
                        )
                      }
                    >
                      {scanOpen ? "close" : "scan"}
                    </button>
                  </div>
                </div>
                {scanOpen && (
                  <div className="px-4 pb-3 space-y-2">
                    {c.status === "open" && <QuickTrade mint={c.mint} ticker={c.ticker} />}
                    <Scanner mint={c.mint} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
