/**
 * Jupiter /swap/v1/quote response shape.
 * Source: dev.jup.ag/docs/swap/get-quote.
 * uint64 fields are returned as decimal strings — do NOT parseFloat without precision awareness.
 */
export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: "ExactIn" | "ExactOut";
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount?: string;
      feeMint?: string;
    };
    percent: number;
  }>;
  contextSlot?: number;
  timeTaken?: number;
}

export interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight?: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
}

export type SlippagePreset = "safe" | "default" | "memes" | "degen";

export interface SlippageOption {
  key: SlippagePreset;
  label: string;
  bps: number;
  tone: "neutral" | "amber" | "red";
}

export const SLIPPAGE_PRESETS: readonly SlippageOption[] = [
  { key: "safe",    label: "0.5%", bps: 50,   tone: "neutral" },
  { key: "default", label: "1%",   bps: 100,  tone: "neutral" },
  { key: "memes",   label: "3%",   bps: 300,  tone: "amber"   },
  { key: "degen",   label: "10%",  bps: 1000, tone: "red"     },
] as const;

export type TradeError =
  | "quote-error"
  | "quote-no-route"
  | "insufficient-sol"
  | "slippage-breached"
  | "sim-rejected"
  | "sign-rejected"
  | "network-timeout"
  | "unknown";
