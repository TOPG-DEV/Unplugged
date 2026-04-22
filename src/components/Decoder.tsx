"use client";

import { useState } from "react";
import { formatUsdCompact, formatPctSigned, truncateMint } from "@/lib/format";

const MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

type Verdict = "SIGNAL" | "MIXED" | "NOISE" | "DANGER";

interface DecoderResult {
  unplug_score: number;
  verdict: Verdict;
  headline: string;
  reasoning: string[];
  action: string;
  token: {
    ticker: string;
    mint: string;
    price_usd: number | null;
    mcap_usd: number | null;
    liquidity_usd: number | null;
    volume_24h_usd: number | null;
    change_24h_pct: number | null;
    top10_holder_pct: number | null;
    smart_money_wallets_1h: number;
  };
}

const VERDICT_STYLE: Record<Verdict, { color: string; bg: string; border: string }> = {
  SIGNAL: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/40" },
  MIXED: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/40" },
  NOISE: { color: "text-white/60", bg: "bg-white/5", border: "border-white/20" },
  DANGER: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/40" },
};

export function Decoder() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<DecoderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function decode() {
    const mint = input.trim();
    if (!MINT_REGEX.test(mint)) {
      setError("paste a base58 spl mint (32-44 chars)");
      setResult(null);
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mint }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "decoder is down");
        return;
      }
      setResult(body as DecoderResult);
    } catch {
      setError("network error — try again");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      decode();
    }
  }

  return (
    <div className="border border-white/10 rounded-2xl bg-black/40 backdrop-blur-sm p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex items-center gap-2 text-white"
          style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          <span className="text-xl md:text-2xl">the decoder</span>
          <span
            className="text-[9px] md:text-[10px] uppercase text-white/40 tracking-[0.3em] ml-2 border border-white/15 rounded-full px-2 py-0.5"
            style={{ fontWeight: 600 }}
          >
            beta
          </span>
        </div>
      </div>

      <p
        className="text-sm text-white/55 max-w-2xl mb-6"
        style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 400 }}
      >
        Paste a Solana mint. We pull on-chain safety, liquidity, holder concentration, and smart-money flow — then AI returns a verdict.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="paste a mint — e.g. Dez...pump"
          className="flex-1 min-w-0 px-4 py-3 bg-black/60 border border-white/15 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/40 font-mono text-sm"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="none"
        />
        <button
          type="button"
          onClick={decode}
          disabled={loading || !input.trim()}
          className="px-6 py-3 border border-white rounded-lg text-black bg-white hover:bg-white/90 disabled:bg-white/20 disabled:text-white/40 disabled:border-white/20 disabled:cursor-not-allowed transition-colors uppercase tracking-wider text-sm"
          style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, letterSpacing: "0.1em" }}
        >
          {loading ? "decoding…" : "unplug it"}
        </button>
      </div>

      {error && (
        <div className="mt-4 px-4 py-3 border border-red-500/40 bg-red-500/10 rounded-lg text-sm text-red-300 font-mono">
          {error}
        </div>
      )}

      {result && <DecoderResultCard result={result} />}

      {!result && !error && !loading && (
        <div className="mt-8 flex flex-wrap gap-4 text-[10px] uppercase text-white/35" style={{ letterSpacing: "0.25em" }}>
          <span>on-chain safety</span>
          <span className="text-white/20">·</span>
          <span>smart-money flow</span>
          <span className="text-white/20">·</span>
          <span>narrative reality-check</span>
          <span className="text-white/20">·</span>
          <span>one verdict</span>
        </div>
      )}
    </div>
  );
}

function DecoderResultCard({ result }: { result: DecoderResult }) {
  const style = VERDICT_STYLE[result.verdict];
  const scoreColor =
    result.unplug_score >= 70 ? "text-emerald-400"
    : result.unplug_score >= 45 ? "text-amber-400"
    : result.unplug_score >= 20 ? "text-white/70"
    : "text-red-400";

  return (
    <div className="mt-6 space-y-5 fade-in">
      {/* Verdict strip */}
      <div className={`flex flex-wrap items-center gap-4 p-4 rounded-xl border ${style.border} ${style.bg}`}>
        <div className="flex items-baseline gap-3">
          <span className={`text-4xl md:text-5xl font-black ${scoreColor}`} style={{ fontFamily: "'Archivo', sans-serif", letterSpacing: "-0.03em" }}>
            {result.unplug_score}
          </span>
          <span className="text-[10px] uppercase text-white/40 tracking-[0.3em]">unplug score</span>
        </div>
        <span className={`text-xs uppercase tracking-[0.3em] px-3 py-1 rounded-full border ${style.border} ${style.color}`} style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}>
          {result.verdict}
        </span>
        <span className="text-xs text-white/40 ml-auto font-mono">
          {result.token.ticker} · <code>{truncateMint(result.token.mint)}</code>
        </span>
      </div>

      {/* Headline */}
      <p
        className="text-xl md:text-2xl leading-snug text-white"
        style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, letterSpacing: "-0.02em" }}
      >
        {result.headline}
      </p>

      {/* Reasoning */}
      <ul className="space-y-2 text-sm text-white/70">
        {result.reasoning.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-mono text-white/30">{String(i + 1).padStart(2, "0")}</span>
            <span style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 400 }}>{r}</span>
          </li>
        ))}
      </ul>

      {/* Action bar */}
      <div className="flex items-center gap-2 pt-3 border-t border-white/10">
        <span className="text-[10px] uppercase text-white/40 tracking-[0.3em]">action</span>
        <span
          className="text-sm text-white"
          style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 600 }}
        >
          {result.action}
        </span>
      </div>

      {/* Data strip — mcap-first per brand direction */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-white/10">
        <DataCell label="mcap" value={formatUsdCompact(result.token.mcap_usd)} />
        <DataCell label="liquidity" value={formatUsdCompact(result.token.liquidity_usd)} />
        <DataCell label="24h vol" value={formatUsdCompact(result.token.volume_24h_usd)} />
        <DataCell
          label="24h Δ"
          value={result.token.change_24h_pct != null ? formatPctSigned(result.token.change_24h_pct) : "—"}
        />
        <DataCell
          label="top10"
          value={result.token.top10_holder_pct != null ? `${Math.round(result.token.top10_holder_pct)}%` : "—"}
        />
      </div>
    </div>
  );
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[9px] uppercase text-white/35 tracking-[0.3em]">{label}</div>
      <div className="text-sm font-mono text-white">{value}</div>
    </div>
  );
}

export default Decoder;
