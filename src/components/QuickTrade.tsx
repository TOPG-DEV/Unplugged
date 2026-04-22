"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { quote as jupQuote, buildSwap } from "@/lib/trade/jupiter";
import { loadSlippagePreset, saveSlippagePreset, presetToBps } from "@/lib/trade/slippage";
import {
  SLIPPAGE_PRESETS,
  type SlippagePreset,
  type JupiterQuote,
  type TradeError,
} from "@/lib/types/trade";
import {
  formatPctSigned,
  truncateMint,
  formatSolAmount,
  formatTxSignature,
} from "@/lib/format";

const LAMPORTS_PER_SOL = 1_000_000_000;
const QUOTE_REFRESH_MS = 10_000;
const QUOTE_STALE_MS = 30_000;
const TOAST_MS = 6_000;
const IMPACT_PULSE_MS = 500;

type ModalState =
  | { kind: "closed" }
  | { kind: "quote-loading" }
  | { kind: "quote-ready"; quote: JupiterQuote; fetchedAt: number; impactPulse: boolean }
  | { kind: "quote-error"; error: TradeError }
  | { kind: "quote-no-route" }
  | { kind: "signing"; quote: JupiterQuote }
  | { kind: "tx-failed"; error: TradeError; quote: JupiterQuote }
  | { kind: "sign-rejected"; quote: JupiterQuote };

export interface QuickTradeProps {
  mint: string;
  ticker?: string;
  className?: string;
}

interface Toast {
  kind: "success";
  signature: string;
  expiresAt: number;
}

class SignRejected extends Error {
  constructor(public cause: unknown) {
    super("SIGN_REJECTED");
  }
}

export function QuickTrade({ mint, ticker, className }: QuickTradeProps) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [lamports, setLamports] = useState<number>(0);
  const [preset, setPreset] = useState<SlippagePreset>("default");
  const [state, setState] = useState<ModalState>({ kind: "closed" });
  const [toast, setToast] = useState<Toast | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setPreset(loadSlippagePreset());
  }, []);

  const open = useCallback((amountSol: 0.1 | 0.5 | 1) => {
    setLamports(Math.round(amountSol * LAMPORTS_PER_SOL));
    setState({ kind: "quote-loading" });
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState({ kind: "closed" });
  }, []);

  const fetchQuote = useCallback(
    async (silent = false) => {
      if (!mint || lamports <= 0) return;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      if (!silent) setState({ kind: "quote-loading" });
      try {
        const q = await jupQuote(mint, lamports, presetToBps(preset), ac.signal);
        setState((prev) => {
          const prevImpact =
            prev.kind === "quote-ready" ? parseFloat(prev.quote.priceImpactPct) : null;
          const newImpact = parseFloat(q.priceImpactPct);
          const pulse = prevImpact != null && Math.abs(newImpact - prevImpact) > 0.01;
          return { kind: "quote-ready", quote: q, fetchedAt: Date.now(), impactPulse: pulse };
        });
      } catch (err) {
        if (ac.signal.aborted) return;
        const msg = err instanceof Error ? err.message : "";
        if (msg === "NO_ROUTE") setState({ kind: "quote-no-route" });
        else setState({ kind: "quote-error", error: "quote-error" });
      }
    },
    [mint, lamports, preset]
  );

  // Initial fetch + 10s refresh while modal open
  useEffect(() => {
    if (state.kind !== "quote-loading" && state.kind !== "quote-ready") return;
    if (lamports <= 0) return;

    if (state.kind === "quote-loading") {
      fetchQuote(false);
    }
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        fetchQuote(true);
      }, QUOTE_REFRESH_MS);
    }
    return () => {
      // Interval is cleared in close(); keep it alive across quote-ready refreshes.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind, lamports, preset]);

  // Auto-clear impactPulse 500ms after it fires
  useEffect(() => {
    if (state.kind !== "quote-ready" || !state.impactPulse) return;
    const t = setTimeout(() => {
      setState((prev) =>
        prev.kind === "quote-ready" && prev.impactPulse ? { ...prev, impactPulse: false } : prev
      );
    }, IMPACT_PULSE_MS);
    return () => clearTimeout(t);
  }, [state]);

  // Escape closes
  useEffect(() => {
    if (state.kind === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.kind, close]);

  const onSlippage = useCallback((p: SlippagePreset) => {
    setPreset(p);
    saveSlippagePreset(p);
  }, []);

  // Refetch whenever slippage changes (while modal open)
  const firstSlippageRender = useRef(true);
  useEffect(() => {
    if (firstSlippageRender.current) {
      firstSlippageRender.current = false;
      return;
    }
    if (state.kind === "closed") return;
    fetchQuote(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  const onConfirm = useCallback(async () => {
    if (state.kind !== "quote-ready") return;
    if (!publicKey || !signTransaction) return;
    const q = state.quote;
    setState({ kind: "signing", quote: q });
    try {
      const tx = await buildSwap(q, publicKey.toBase58());
      const signed = await signTransaction(tx).catch((e) => {
        throw new SignRejected(e);
      });
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        maxRetries: 0,
        skipPreflight: true,
      });
      setToast({ kind: "success", signature: sig, expiresAt: Date.now() + TOAST_MS });
      setTimeout(close, 600);
    } catch (err) {
      if (err instanceof SignRejected) {
        setState({ kind: "sign-rejected", quote: q });
      } else {
        const msg = err instanceof Error ? err.message.toLowerCase() : "";
        let mapped: TradeError = "unknown";
        if (msg.includes("insufficient") || msg.includes("attempt to debit"))
          mapped = "insufficient-sol";
        else if (msg.includes("slippage")) mapped = "slippage-breached";
        else if (msg.includes("simulate") || msg.includes("paused")) mapped = "sim-rejected";
        else if (msg.includes("timeout") || msg.includes("blockheight"))
          mapped = "network-timeout";
        setState({ kind: "tx-failed", error: mapped, quote: q });
      }
    }
  }, [state, publicKey, signTransaction, connection, close]);

  // Toast expiry
  useEffect(() => {
    if (!toast) return;
    const ms = toast.expiresAt - Date.now();
    const t = setTimeout(() => setToast(null), Math.max(100, ms));
    return () => clearTimeout(t);
  }, [toast]);

  const walletConnected = publicKey != null && signTransaction != null;
  const displayTicker = ticker ? `$${ticker.toUpperCase()}` : truncateMint(mint);

  return (
    <div className={className}>
      {/* Inline trigger pills */}
      <div className="flex items-center gap-1">
        {([0.1, 0.5, 1] as const).map((a) => (
          <button
            key={a}
            type="button"
            disabled={!walletConnected}
            onClick={() => open(a)}
            className={
              "text-[10px] uppercase tracking-wider font-mono border rounded px-2 py-0.5 transition-colors " +
              (walletConnected
                ? "border-[#1e4465]/60 text-gray-400 hover:text-[#7fd0ff] hover:border-[#7fd0ff]/50"
                : "border-gray-800 text-gray-600 cursor-not-allowed")
            }
            title={walletConnected ? `Buy ${a} SOL of ${displayTicker}` : "connect wallet"}
          >
            {formatSolAmount(a)} SOL
          </button>
        ))}
      </div>

      {/* Modal */}
      {state.kind !== "closed" && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={close}
          role="presentation"
        >
          <div
            className="max-w-[420px] w-full mx-4 border border-[#1e4465] bg-[#060e15f0] rounded-xl backdrop-blur-md p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="qt-title"
          >
            <div className="flex items-center justify-between">
              <span id="qt-title" className="text-sm uppercase tracking-wider text-[#7fd0ff]">
                Quick Trade
              </span>
              <button
                type="button"
                onClick={close}
                className="text-gray-500 hover:text-[#7fd0ff] text-xs"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="text-xs text-gray-400">
                Buying <span className="font-bold text-white">{displayTicker}</span>
              </div>
              <div className="text-[10px] font-mono text-gray-500">{truncateMint(mint)}</div>
            </div>

            <QuoteBlock state={state} lamports={lamports} />

            <SlippageSelector
              preset={preset}
              onChange={onSlippage}
              disabled={state.kind === "signing"}
            />

            <ConfirmButton
              state={state}
              onConfirm={onConfirm}
              onRetry={() => fetchQuote(false)}
              onRetryHigherSlippage={() => {
                onSlippage("memes");
              }}
              onClose={close}
              walletConnected={walletConnected}
            />

            <div className="text-[10px] text-gray-500 text-center">
              your wallet signs — non-custodial
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 border border-emerald-700 bg-[#060e15f0] rounded-lg p-3 shadow-lg max-w-xs"
        >
          <div className="text-sm text-emerald-400">✓ Swap sent</div>
          <a
            href={`https://solscan.io/tx/${toast.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-gray-400 hover:text-[#7fd0ff]"
          >
            {formatTxSignature(toast.signature)}
          </a>
        </div>
      )}
    </div>
  );
}

// ---- helper sub-components ----

function QuoteBlock({ state, lamports }: { state: ModalState; lamports: number }) {
  if (state.kind === "quote-loading" || state.kind === "signing") {
    return (
      <div className="border border-[#1e4465]/60 rounded-lg p-3 space-y-2" aria-busy="true">
        <div className="animate-pulse bg-gray-800 h-5 w-full rounded" />
        <div className="animate-pulse bg-gray-800 h-5 w-3/4 rounded" />
        <div className="animate-pulse bg-gray-800 h-4 w-1/2 rounded" />
      </div>
    );
  }
  if (state.kind === "quote-no-route") {
    return (
      <div className="border border-amber-700 rounded-lg p-3 text-xs text-amber-400">
        No route found for this mint right now. Try again in ~30s or use your wallet&apos;s
        built-in swap.
      </div>
    );
  }
  if (state.kind === "quote-error") {
    return (
      <div className="border border-red-700 rounded-lg p-3 text-xs text-red-400">
        Quote unavailable. Jupiter rate-limited or network hiccup. Try again in ~30s.
      </div>
    );
  }
  if (state.kind === "tx-failed") {
    return <TxFailedCard error={state.error} />;
  }
  if (state.kind === "sign-rejected") {
    return (
      <div className="border border-red-700 rounded-lg p-3 text-xs text-red-400">
        Signature cancelled — try again when ready.
      </div>
    );
  }
  // quote-ready (all other discriminants returned above; this is exhaustive)
  if (state.kind !== "quote-ready") return null;
  const q = state.quote;
  const impact = parseFloat(q.priceImpactPct);
  const impactCls =
    impact < 0.01 ? "text-emerald-400" : impact < 0.03 ? "text-amber-400" : "text-red-400 font-bold";
  const route = q.routePlan?.map((r: JupiterQuote["routePlan"][number]) => r.swapInfo.label).join(" → ") || "—";
  const outHuman = estimateOutHuman(q.outAmount, q.outputMint);
  const minOutHuman = estimateOutHuman(q.otherAmountThreshold, q.outputMint);

  return (
    <div className="border border-[#1e4465]/60 rounded-lg p-3 space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-gray-400">You pay</span>
        <span className="text-xl font-bold font-mono text-white">
          {formatSolAmount(lamports / LAMPORTS_PER_SOL)} SOL
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-gray-400">You receive</span>
        <span className="text-xl font-bold font-mono text-white">{outHuman}</span>
      </div>
      <div className="border-t border-[#1e4465]/40 pt-2 space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-400">Price impact</span>
          <span className={`text-xs font-mono ${impactCls}`}>
            {formatPctSigned(-Math.abs(impact))}
            {impact >= 0.03 ? " ⚠️ high impact" : ""}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-400">Route</span>
          <span className="text-xs font-mono text-gray-500 truncate max-w-[60%]">{route}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-400">Minimum output</span>
          <span className="text-xs font-mono text-gray-300">{minOutHuman}</span>
        </div>
      </div>
    </div>
  );
}

function TxFailedCard({ error }: { error: TradeError }) {
  const copy: Record<TradeError, string> = {
    "insufficient-sol": "Not enough SOL for this swap + fees. Need ~0.01 SOL buffer.",
    "slippage-breached": "Price moved — slippage cap hit. Retry with higher slippage?",
    "sim-rejected": "Swap failed to simulate. Mint may be paused or untradeable.",
    "network-timeout": "Network timed out. Your wallet was not charged. Retry.",
    unknown: "Swap failed. Retry or try a different size.",
    "quote-error": "",
    "quote-no-route": "",
    "sign-rejected": "",
  };
  return (
    <div className="border border-red-700 rounded-lg p-3 text-xs text-red-400">
      {copy[error] || copy.unknown}
    </div>
  );
}

function SlippageSelector({
  preset,
  onChange,
  disabled,
}: {
  preset: SlippagePreset;
  onChange: (p: SlippagePreset) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Slippage</div>
      <div className="flex items-center gap-1">
        {SLIPPAGE_PRESETS.map((p) => {
          const active = p.key === preset;
          let cls =
            "text-[10px] uppercase tracking-wider font-mono border rounded px-2 py-0.5 transition-colors ";
          if (active) {
            if (p.tone === "amber") cls += "border-amber-500/50 text-amber-400 bg-[#0b1b2a]";
            else if (p.tone === "red") cls += "border-red-500/50 text-red-400 bg-[#0b1b2a]";
            else cls += "border-[#7fd0ff] text-[#7fd0ff] bg-[#0b1b2a]";
          } else {
            cls +=
              "border-[#1e4465]/60 text-gray-400 hover:text-[#7fd0ff] hover:border-[#7fd0ff]/50";
          }
          return (
            <button
              key={p.key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(p.key)}
              className={cls}
              aria-pressed={active}
              aria-label={`Slippage ${p.label}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmButton(props: {
  state: ModalState;
  onConfirm: () => void;
  onRetry: () => void;
  onRetryHigherSlippage: () => void;
  onClose: () => void;
  walletConnected: boolean;
}) {
  const { state, onConfirm, onRetry, onRetryHigherSlippage, onClose, walletConnected } = props;

  if (state.kind === "quote-loading") {
    return (
      <button
        disabled
        type="button"
        className="w-full text-sm uppercase tracking-wider border border-gray-700 text-gray-500 rounded-lg py-3"
      >
        Fetching quote…
      </button>
    );
  }
  if (state.kind === "quote-ready") {
    const stale = Date.now() - state.fetchedAt > QUOTE_STALE_MS;
    const ringCls = state.impactPulse ? " ring-2 ring-[#7fd0ff]/60" : "";
    return (
      <button
        autoFocus
        type="button"
        onClick={onConfirm}
        disabled={!walletConnected || stale}
        className={`w-full text-sm uppercase tracking-wider border border-[#7fd0ff] bg-[#0b1b2a] text-[#7fd0ff] rounded-lg py-3 hover:bg-[#7fd0ff] hover:text-black transition-colors disabled:border-gray-700 disabled:text-gray-500 disabled:bg-transparent${ringCls}`}
      >
        {stale ? "Fetching quote…" : "Confirm Buy"}
      </button>
    );
  }
  if (
    state.kind === "quote-error" ||
    state.kind === "sign-rejected" ||
    (state.kind === "tx-failed" && state.error === "network-timeout")
  ) {
    return (
      <button
        autoFocus
        type="button"
        onClick={onRetry}
        className="w-full text-sm uppercase tracking-wider border border-[#7fd0ff] text-[#7fd0ff] rounded-lg py-3 hover:bg-[#7fd0ff]/10"
      >
        Retry
      </button>
    );
  }
  if (state.kind === "tx-failed" && state.error === "slippage-breached") {
    return (
      <button
        autoFocus
        type="button"
        onClick={onRetryHigherSlippage}
        className="w-full text-sm uppercase tracking-wider border border-amber-500 text-amber-400 rounded-lg py-3 hover:bg-amber-500/10"
      >
        Retry at 3%
      </button>
    );
  }
  if (
    state.kind === "quote-no-route" ||
    (state.kind === "tx-failed" && (state.error === "insufficient-sol" || state.error === "sim-rejected"))
  ) {
    return (
      <button
        autoFocus
        type="button"
        onClick={onClose}
        className="w-full text-sm uppercase tracking-wider border border-gray-600 text-gray-400 rounded-lg py-3 hover:text-[#7fd0ff]"
      >
        Close
      </button>
    );
  }
  if (state.kind === "signing") {
    return (
      <button
        disabled
        type="button"
        className="w-full text-sm uppercase tracking-wider border border-gray-700 text-gray-500 rounded-lg py-3"
      >
        Signing…
      </button>
    );
  }
  return null;
}

/**
 * Convert Jupiter outAmount (uint64-as-string in token base units) to a
 * human-readable label. SOL outputs divide by 1e9; other tokens render the
 * raw integer with thousands separators (per-mint decimals lookup is a
 * future refinement).
 */
function estimateOutHuman(amountStr: string, outputMint: string): string {
  if (!amountStr) return "—";
  if (outputMint === "So11111111111111111111111111111111111111112") {
    const sol = Number(amountStr) / LAMPORTS_PER_SOL;
    return `${formatSolAmount(sol)} SOL`;
  }
  try {
    const n = Number(amountStr);
    if (!Number.isFinite(n)) return amountStr;
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  } catch {
    return amountStr;
  }
}
