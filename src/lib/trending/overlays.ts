import { fetchRugcheckData } from "@/lib/scanner/rugcheck";
import { BADGE_PRIORITY, type SignalBadge, type TrendingRow } from "@/lib/types/trending";
import type { CandidateScore } from "./score";

const NEW_PAIR_MS = 4 * 60 * 60 * 1000;
const LOW_VOL_USD = 20_000;
const TOP10_UNDERWATER_PCT = 60;   // top10 concentration ≥60% → underwater proxy
const TOP10_MIXED_PCT = 30;        // 30-60% → mixed; <30% → winning

interface DexPair {
  baseToken?: { symbol?: string };
  priceUsd?: string;
  fdv?: number;
  marketCap?: number;
  liquidity?: { usd?: number };
  pairCreatedAt?: number;
  priceChange?: { h1?: number; h24?: number };
}

async function fetchDexPair(mint: string): Promise<DexPair | null> {
  // Raw DexScreener pair — the scanner's `fetchDexScreenerData` returns a computed
  // summary that drops ticker + marketCap, which the Trending UI requires. Keep the
  // scanner module untouched per plan direction and do one inline fetch here.
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { pairs?: DexPair[] | null };
    return data.pairs?.[0] ?? null;
  } catch {
    return null;
  }
}

function prioritizeBadges(badges: SignalBadge[]): SignalBadge[] {
  return [...new Set(badges)]
    .sort((a, b) => BADGE_PRIORITY[b] - BADGE_PRIORITY[a])
    .slice(0, 3);
}

async function enrichOne(c: CandidateScore): Promise<Omit<TrendingRow, "rank"> | null> {
  const [rugResult, pairResult] = await Promise.allSettled([
    fetchRugcheckData(c.mint),
    fetchDexPair(c.mint),
  ]);
  const rug = rugResult.status === "fulfilled" ? rugResult.value : null;
  const pair = pairResult.status === "fulfilled" ? pairResult.value : null;
  if (!rug && !pair) return null; // drop candidates with zero metadata

  const pair_age_ms = pair?.pairCreatedAt ? Date.now() - pair.pairCreatedAt : null;
  const liquidity_usd = pair?.liquidity?.usd ?? null;

  const badges: SignalBadge[] = [];
  if (c.smart_money_aliases.length > 0) badges.push("SMART_MONEY");
  if (pair_age_ms != null && pair_age_ms < NEW_PAIR_MS) badges.push("NEW_PAIR");
  if (liquidity_usd != null && liquidity_usd < LOW_VOL_USD) badges.push("LOW_VOL");

  let top_holder_pnl_label: TrendingRow["top_holder_pnl_label"] = null;

  if (rug) {
    const top10 = rug.top10HolderPct ?? 0;
    const isHoneypot = rug.honeypotFlag === true;
    // UNSAFE: honeypot OR (LP not locked AND top-10 concentration >60%)
    // lpLocked Light values: "green" = locked well, "yellow"/"red"/"unknown" = not
    const lpNotLocked = rug.lpLocked !== "green";
    if (isHoneypot || (lpNotLocked && top10 > 60)) badges.push("UNSAFE");

    // BUNDLE_RISK proxy: tight top-holder concentration on a new pair (TODO(phase-5):
    // refine with Helius slot analysis per 03-RESEARCH.md §Pitfall AI-5).
    if (pair_age_ms != null && pair_age_ms < NEW_PAIR_MS && top10 > 50) {
      badges.push("BUNDLE_RISK");
    }

    // Top-holder PnL label — simplification since scanner's Rugcheck summary doesn't
    // expose per-holder entry price. Proxy on concentration band.
    // TODO(phase-5): wire Jupiter per-holder entry-price lookup for true PnL.
    if (top10 >= TOP10_UNDERWATER_PCT) {
      badges.push("TOP10_UNDERWATER");
      top_holder_pnl_label = "underwater";
    } else if (top10 >= TOP10_MIXED_PCT) {
      badges.push("TOP10_MIXED");
      top_holder_pnl_label = "mixed";
    } else if (top10 > 0) {
      badges.push("TOP10_WINNING");
      top_holder_pnl_label = "winning";
    }
  }

  const ticker = pair?.baseToken?.symbol ? `$${pair.baseToken.symbol}` : "$???";
  const price_usd = pair?.priceUsd ? parseFloat(pair.priceUsd) : null;
  const mcap_usd = pair?.fdv ?? pair?.marketCap ?? null;
  const pct_change_1h = pair?.priceChange?.h1 != null ? pair.priceChange.h1 / 100 : null;
  const pct_change_24h = pair?.priceChange?.h24 != null ? pair.priceChange.h24 / 100 : null;

  return {
    mint: c.mint,
    ticker,
    price_usd,
    mcap_usd,
    liquidity_usd,
    pct_change_1h,
    pct_change_24h,
    bucket_volume_sol: c.bucket_volume_sol,
    unique_buyers_1h: c.unique_buyers_1h,
    score: c.score,
    badges: prioritizeBadges(badges),
    smart_money_hits: c.smart_money_aliases,
    pair_age_ms,
    top_holder_pnl_label,
  };
}

/**
 * Enrich all ranked candidates in parallel (bounded concurrency = 4 to respect
 * DexScreener + Rugcheck rate limits). Drops candidates that fail metadata lookup
 * entirely. Returns up to 10 TrendingRow objects with rank filled 1..10.
 */
export async function computeOverlays(candidates: CandidateScore[]): Promise<TrendingRow[]> {
  const results: Array<Omit<TrendingRow, "rank">> = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const enriched = await Promise.all(batch.map((c) => enrichOne(c)));
    for (const e of enriched) if (e) results.push(e);
  }
  return results.slice(0, 10).map((r, i) => ({ ...r, rank: i + 1 }));
}

/**
 * Force the scan_cache to be warm for these mints so a member clicking SCAN in a
 * Trending row hits cache, not network. Non-critical — if this throws, caller logs
 * and continues.
 */
export async function precomputeScanCache(mints: string[]): Promise<void> {
  const CONCURRENCY = 4;
  for (let i = 0; i < mints.length; i += CONCURRENCY) {
    const batch = mints.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (m) => {
        await Promise.allSettled([fetchRugcheckData(m), fetchDexPair(m)]);
      })
    );
  }
}
