import clientPromise from "@/lib/mongo";
import { getSmartMoneyWallets } from "./kol-wallets";
import { scoreCandidate, rankCandidates, type CandidateScore } from "./score";
import { computeOverlays, precomputeScanCache } from "./overlays";
import type { TrendingBucket, TrendingSnapshot } from "@/lib/types/trending";
import type { TrackedWallet } from "@/lib/types/tracker";

const BUCKET_MS = 15 * 60 * 1000;
const PER_WALLET_LIMIT = 5;              // Pitfall AI-5: lower than tracker's 20 — recent-only
const CONCURRENCY = 3;                   // Helius free tier = 2 req/s with jitter room
const RETENTION_S = 14_400;              // 4h TTL on buckets
const HELIUS_BASE = "https://api.helius.xyz/v0/addresses";
const SOL_MINT = "So11111111111111111111111111111111111111112";

interface HeliusSwapSide {
  userAccount?: string;
  mint?: string;
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
  events?: { swap?: HeliusSwap | null };
}

interface ParsedBuy {
  mint: string;
  sol_amount: number;
  buyer: string;
  timestamp_ms: number;
}

interface TrendingIngestResult {
  walletsPolled: number;
  swapsParsed: number;
  bucketsWritten: number;
  rowsInSnapshot: number;
  durationMs: number;
  errors: string[];
}

function toSolAmount(side: HeliusNativeSide | null | undefined): number {
  if (!side || side.amount == null) return 0;
  const n = typeof side.amount === "string" ? parseInt(side.amount, 10) : side.amount;
  if (!Number.isFinite(n)) return 0;
  return n / 1e9;
}

/**
 * Extract a buy event from a Helius enhanced-tx for this wallet. Returns null for
 * non-swap, sells, LP ops, and SOL-only transfers. Handles the wSOL-on-token-inputs
 * case per Pitfall AI-2.
 */
function parseBuy(tx: HeliusTx, wallet: TrackedWallet): ParsedBuy | null {
  const swap = tx.events?.swap;
  if (!swap) return null;

  const nativeIn = toSolAmount(swap.nativeInput);
  const nativeOut = toSolAmount(swap.nativeOutput);
  const tokenInputs = swap.tokenInputs ?? [];
  const tokenOutputs = swap.tokenOutputs ?? [];

  let mint: string | null = null;
  let sol_amount = 0;

  if (nativeIn > 0 && tokenOutputs.length > 0 && tokenOutputs[0]?.mint) {
    // Standard SOL-in → token-out buy.
    mint = tokenOutputs[0].mint;
    sol_amount = nativeIn;
  } else if (
    // wSOL-on-token-inputs case: SOL appears on token side as wrapped SOL.
    nativeIn === 0 &&
    nativeOut === 0 &&
    tokenInputs[0]?.mint === SOL_MINT &&
    tokenOutputs.length > 0 &&
    tokenOutputs[0]?.mint &&
    tokenOutputs[0].mint !== SOL_MINT
  ) {
    mint = tokenOutputs[0].mint;
    sol_amount = tokenInputs[0]?.tokenAmount ?? 0;
  } else {
    return null; // sell, LP op, or nothing actionable for trending
  }

  if (!mint || mint === SOL_MINT) return null;
  if (sol_amount <= 0) return null;

  // Guard: skip when mint appears on both sides (LP op)
  if (tokenInputs.some((i) => i.mint === mint)) return null;

  return {
    mint,
    sol_amount,
    buyer: wallet.pubkey,
    timestamp_ms: tx.timestamp * 1000,
  };
}

async function fetchWalletTxs(wallet: TrackedWallet, apiKey: string): Promise<HeliusTx[]> {
  const url = `${HELIUS_BASE}/${wallet.pubkey}/transactions?api-key=${apiKey}&limit=${PER_WALLET_LIMIT}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`helius ${res.status} for ${wallet.alias}`);
  const data = (await res.json()) as HeliusTx[];
  return Array.isArray(data) ? data : [];
}

async function runConcurrent<T, R>(
  items: T[],
  limit: number,
  fn: (x: T) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> {
  const out: Array<PromiseSettledResult<R>> = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const settled = await Promise.allSettled(batch.map(fn));
    out.push(...settled);
  }
  return out;
}

/**
 * Top-level ingest entry. Called by /api/cron/trending every 5 min.
 * Never throws — all errors collected in the returned object.
 */
export async function ingestTrending(): Promise<TrendingIngestResult> {
  const t0 = Date.now();
  const errors: string[] = [];
  const out: TrendingIngestResult = {
    walletsPolled: 0,
    swapsParsed: 0,
    bucketsWritten: 0,
    rowsInSnapshot: 0,
    durationMs: 0,
    errors,
  };

  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    errors.push("HELIUS_API_KEY not set");
    out.durationMs = Date.now() - t0;
    return out;
  }

  const wallets = getSmartMoneyWallets();
  if (wallets.length === 0) {
    errors.push("no smart-money wallets configured");
    out.durationMs = Date.now() - t0;
    return out;
  }

  const client = await clientPromise;
  const db = client.db("unpluggedDB");
  const bucketsCol = db.collection<TrendingBucket>("trending_buckets");
  const snapCol = db.collection<TrendingSnapshot>("trending_snapshot");

  // Idempotent index creation (cheap if indexes already exist).
  try {
    await bucketsCol.createIndex({ mint: 1, bucket_start: -1 });
    await bucketsCol.createIndex({ created_at: 1 }, { expireAfterSeconds: RETENTION_S });
  } catch (err) {
    errors.push(`index creation: ${err instanceof Error ? err.message : "unknown"}`);
  }

  // --- 1. Fan out Helius polls ---
  const settled = await runConcurrent(wallets, CONCURRENCY, async (w) => {
    try {
      const txs = await fetchWalletTxs(w, apiKey);
      const buys: ParsedBuy[] = [];
      for (const tx of txs) {
        const b = parseBuy(tx, w);
        if (b) buys.push(b);
      }
      return { wallet: w, buys };
    } catch (err) {
      throw new Error(`${w.alias}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  });

  const allBuys: Array<ParsedBuy & { wallet_alias: string }> = [];
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    const w = wallets[i];
    out.walletsPolled++;
    if (r.status === "rejected") {
      errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
      continue;
    }
    for (const b of r.value.buys) allBuys.push({ ...b, wallet_alias: w.alias });
  }
  out.swapsParsed = allBuys.length;

  // --- 2. Upsert into trending_buckets (one write per (mint, bucket_start)) ---
  // Group buys by (mint, bucket_start_ms) so we can aggregate unique_buyers + alias
  // sets before issuing writes.
  const grouped = new Map<string, {
    mint: string;
    bucket_start: Date;
    buy_sol_total: number;
    unique_buyers: Set<string>;
    smart_money_hits: Set<string>;
    tx_count: number;
  }>();

  for (const b of allBuys) {
    const startMs = Math.floor(b.timestamp_ms / BUCKET_MS) * BUCKET_MS;
    const key = `${b.mint}|${startMs}`;
    let g = grouped.get(key);
    if (!g) {
      g = {
        mint: b.mint,
        bucket_start: new Date(startMs),
        buy_sol_total: 0,
        unique_buyers: new Set<string>(),
        smart_money_hits: new Set<string>(),
        tx_count: 0,
      };
      grouped.set(key, g);
    }
    g.buy_sol_total += b.sol_amount;
    g.unique_buyers.add(b.buyer);
    g.smart_money_hits.add(b.wallet_alias);
    g.tx_count += 1;
  }

  for (const g of grouped.values()) {
    try {
      await bucketsCol.updateOne(
        { mint: g.mint, bucket_start: g.bucket_start },
        {
          $inc: { buy_sol_total: g.buy_sol_total, tx_count: g.tx_count },
          $addToSet: {
            unique_buyers: { $each: [...g.unique_buyers] },
            smart_money_hits: { $each: [...g.smart_money_hits] },
          },
          $setOnInsert: { created_at: new Date(), sell_sol_total: 0 },
        },
        { upsert: true }
      );
      out.bucketsWritten++;
    } catch (err) {
      errors.push(`bucket upsert ${g.mint}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  // --- 3. Score per mint ---
  // Pull distinct mints touched in the last 4h, then fetch each mint's last 17 buckets.
  const fourHoursAgo = new Date(Date.now() - RETENTION_S * 1000);
  let mints: string[] = [];
  try {
    mints = (await bucketsCol
      .distinct("mint", { bucket_start: { $gte: fourHoursAgo } })) as string[];
  } catch (err) {
    errors.push(`distinct mints: ${err instanceof Error ? err.message : "unknown"}`);
  }

  const scores: CandidateScore[] = [];
  for (const mint of mints) {
    try {
      const buckets = await bucketsCol
        .find({ mint })
        .sort({ bucket_start: -1 })
        .limit(17)
        .toArray();
      const s = scoreCandidate(buckets);
      if (s) scores.push(s);
    } catch (err) {
      errors.push(`score ${mint}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  // --- 4. Rank → overlays → snapshot ---
  const top20 = rankCandidates(scores, 20);
  let rows: TrendingSnapshot["rows"] = [];
  try {
    rows = await computeOverlays(top20);
  } catch (err) {
    errors.push(`overlays: ${err instanceof Error ? err.message : "unknown"}`);
  }
  out.rowsInSnapshot = rows.length;

  try {
    await snapCol.updateOne(
      { _id: "current" },
      {
        $set: {
          generated_at: new Date(),
          rows,
          source_window_ms: BUCKET_MS,
          baseline_window_ms: RETENTION_S * 1000,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    errors.push(`snapshot upsert: ${err instanceof Error ? err.message : "unknown"}`);
  }

  // --- 5. Fire-and-forget scan cache warm ---
  try {
    await precomputeScanCache(rows.map((r) => r.mint));
  } catch (err) {
    errors.push(`scan cache warm: ${err instanceof Error ? err.message : "unknown"}`);
  }

  out.durationMs = Date.now() - t0;
  console.log(
    `[trending] polled=${out.walletsPolled} swaps=${out.swapsParsed} buckets=${out.bucketsWritten} rows=${out.rowsInSnapshot} ms=${out.durationMs}`
  );
  return out;
}
