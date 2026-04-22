import { VersionedTransaction } from "@solana/web3.js";
import type { JupiterQuote, JupiterSwapResponse } from "@/lib/types/trade";

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const JUP_SWAP_V1_BASE = "https://api.jup.ag/swap/v1";

const PRIORITY_LEVEL = "veryHigh" as const;
const PRIORITY_MAX_LAMPORTS = 10_000_000; // 0.01 SOL

/**
 * GET Jupiter quote. Throws tagged Error so caller can map to TradeError.
 *   NO_ROUTE        — Jupiter returned no outAmount
 *   QUOTE_HTTP_{n}  — non-2xx
 *   QUOTE_ERROR:{m} — JSON { error } body
 */
export async function quote(
  outputMint: string,
  solLamports: number,
  slippageBps: number,
  signal?: AbortSignal
): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint: SOL_MINT,
    outputMint,
    amount: String(solLamports),
    slippageBps: String(slippageBps),
    swapMode: "ExactIn",
  });
  const res = await fetch(`${JUP_SWAP_V1_BASE}/quote?${params.toString()}`, {
    signal,
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`QUOTE_HTTP_${res.status}`);
  const data = (await res.json()) as JupiterQuote & { error?: string };
  if (data.error) throw new Error(`QUOTE_ERROR:${data.error}`);
  if (!data.outAmount || data.outAmount === "0") throw new Error("NO_ROUTE");
  return data;
}

/**
 * POST Jupiter swap. Returns deserialized VersionedTransaction ready for
 * wallet.signTransaction().
 *   SWAP_HTTP_{n}   — non-2xx
 *   SWAP_EMPTY      — missing swapTransaction
 */
export async function buildSwap(
  quoteResponse: JupiterQuote,
  userPublicKey: string,
  signal?: AbortSignal
): Promise<VersionedTransaction> {
  const body = {
    quoteResponse,
    userPublicKey,
    dynamicComputeUnitLimit: true,
    prioritizationFeeLamports: {
      priorityLevelWithMaxLamports: {
        maxLamports: PRIORITY_MAX_LAMPORTS,
        global: false,
        priorityLevel: PRIORITY_LEVEL,
      },
    },
  };
  const res = await fetch(`${JUP_SWAP_V1_BASE}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`SWAP_HTTP_${res.status}`);
  const data = (await res.json()) as JupiterSwapResponse;
  if (!data.swapTransaction) throw new Error("SWAP_EMPTY");

  const bytes =
    typeof Buffer !== "undefined"
      ? Buffer.from(data.swapTransaction, "base64")
      : Uint8Array.from(atob(data.swapTransaction), (c) => c.charCodeAt(0));
  return VersionedTransaction.deserialize(bytes);
}
