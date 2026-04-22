import clientPromise from "@/lib/mongo";
import { getTrackedWallets } from "@/lib/tracker/wallets";
import type { TrackerEvent, TrackedWallet } from "@/lib/types/tracker";

const HELIUS_BASE = "https://api.helius.xyz/v0/addresses";
const PER_WALLET_LIMIT = 20;

interface HeliusSwapSide {
  userAccount?: string;
  mint?: string;
  rawTokenAmount?: { tokenAmount: string; decimals: number };
  tokenName?: string;
  tokenAmount?: number;
}

interface HeliusNativeSide {
  account?: string;
  amount?: string | number;
}

interface HeliusSwap {
  nativeInput?: HeliusNativeSide | null;
  nativeOutput?: HeliusNativeSide | null;
  tokenInputs?: HeliusSwapSide[];
  tokenOutputs?: HeliusSwapSide[];
}

interface HeliusTx {
  signature: string;
  timestamp: number;
  type?: string;
  source?: string;
  events?: { swap?: HeliusSwap | null };
}

interface IngestResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

function toSolAmount(side: HeliusNativeSide | null | undefined): number {
  if (!side || side.amount == null) return 0;
  const n = typeof side.amount === "string" ? parseInt(side.amount, 10) : side.amount;
  if (!Number.isFinite(n)) return 0;
  return n / 1e9;
}

function deriveEvent(
  tx: HeliusTx,
  wallet: TrackedWallet,
  ingested_at: Date
): TrackerEvent | null {
  const swap = tx.events?.swap;
  if (!swap) return null;

  const nativeIn = toSolAmount(swap.nativeInput);
  const nativeOut = toSolAmount(swap.nativeOutput);
  const tokenInputs = swap.tokenInputs ?? [];
  const tokenOutputs = swap.tokenOutputs ?? [];

  let direction: "buy" | "sell" | null = null;
  let mint: string | null = null;
  let ticker: string | null = null;
  let sol_amount = 0;

  if (nativeIn > 0 && tokenOutputs.length > 0 && tokenOutputs[0]?.mint) {
    direction = "buy";
    mint = tokenOutputs[0].mint;
    ticker = tokenOutputs[0].tokenName ?? null;
    sol_amount = nativeIn;
  } else if (nativeOut > 0 && tokenInputs.length > 0 && tokenInputs[0]?.mint) {
    direction = "sell";
    mint = tokenInputs[0].mint;
    ticker = tokenInputs[0].tokenName ?? null;
    sol_amount = nativeOut;
  }

  if (direction == null || mint == null) return null;

  return {
    signature: tx.signature,
    wallet: wallet.pubkey,
    wallet_alias: wallet.alias,
    direction,
    mint,
    ticker,
    sol_amount,
    usd_amount: null,
    source: tx.source ?? "UNKNOWN",
    timestamp: tx.timestamp,
    ingested_at,
  };
}

async function fetchWalletTxs(wallet: TrackedWallet, apiKey: string): Promise<HeliusTx[]> {
  const url = `${HELIUS_BASE}/${wallet.pubkey}/transactions?api-key=${apiKey}&limit=${PER_WALLET_LIMIT}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`helius ${res.status} for ${wallet.alias}`);
  }
  const data = (await res.json()) as HeliusTx[];
  return Array.isArray(data) ? data : [];
}

export async function ingestTrackerEvents(): Promise<IngestResult> {
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    return { inserted: 0, skipped: 0, errors: ["HELIUS_API_KEY not set"] };
  }

  const wallets = getTrackedWallets();
  if (wallets.length === 0) {
    return { inserted: 0, skipped: 0, errors: ["no tracked wallets configured"] };
  }

  const client = await clientPromise;
  const col = client.db("unpluggedDB").collection<TrackerEvent>("tracker_events");
  await col.createIndex({ signature: 1 }, { unique: true });

  const ingested_at = new Date();
  const candidates: TrackerEvent[] = [];
  const errors: string[] = [];

  for (const wallet of wallets) {
    try {
      const txs = await fetchWalletTxs(wallet, apiKey);
      for (const tx of txs) {
        const ev = deriveEvent(tx, wallet, ingested_at);
        if (ev) candidates.push(ev);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown";
      console.error(`tracker ingest failed for ${wallet.alias} (${wallet.pubkey}):`, msg);
      errors.push(`${wallet.alias}: ${msg}`);
    }
  }

  if (candidates.length === 0) {
    return { inserted: 0, skipped: 0, errors };
  }

  let inserted = 0;
  let skipped = 0;
  try {
    const res = await col.insertMany(candidates, { ordered: false });
    inserted = res.insertedCount;
    skipped = candidates.length - inserted;
  } catch (err) {
    const e = err as { result?: { insertedCount?: number }; writeErrors?: unknown[] };
    if (e.result?.insertedCount != null) {
      inserted = e.result.insertedCount;
      skipped = candidates.length - inserted;
    } else {
      errors.push(err instanceof Error ? err.message : "insert failed");
    }
  }

  return { inserted, skipped, errors };
}
