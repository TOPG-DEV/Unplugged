import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Live trending memes — pulled from DexScreener's token-profiles feed
// (the one that powers dexscreener.com's trending surface). These are
// recently-profiled / boosted tokens — heavily pump.fun / moonshot
// style. We filter to Solana, enrich with price + volume via the tokens
// batch endpoint, and sort by 24h volume.

interface DexProfile {
  chainId?: string;
  tokenAddress?: string;
}

interface DexPair {
  chainId?: string;
  baseToken?: { address?: string; symbol?: string };
  priceUsd?: string;
  priceChange?: { h1?: number; h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
  marketCap?: number;
  fdv?: number;
}

interface HotTokenRow {
  ticker: string;
  mint: string;
  price_usd: number | null;
  mcap_usd: number | null;
  change_1h: number | null;
  change_24h: number | null;
  volume_24h_usd: number | null;
  liquidity_usd: number | null;
}

// Small fallback list in case DexScreener's trending feed hiccups — keeps
// the ticker from ever going empty. Pump-flavored.
const FALLBACK_MINTS = [
  "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump",
  "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump",
];

async function fetchTrendingMints(): Promise<string[]> {
  try {
    // token-profiles: recently-submitted profiles, proxy for "what's
    // actively being promoted / noticed right now"
    const profiles = await fetch(
      "https://api.dexscreener.com/token-profiles/latest/v1",
      { next: { revalidate: 60 } }
    );
    // token-boosts: tokens whose owners are paying to boost visibility
    const boosts = await fetch(
      "https://api.dexscreener.com/token-boosts/top/v1",
      { next: { revalidate: 60 } }
    );

    const out = new Set<string>();
    if (profiles.ok) {
      const data = (await profiles.json()) as DexProfile[];
      for (const p of data) {
        if (p.chainId === "solana" && p.tokenAddress) out.add(p.tokenAddress);
      }
    }
    if (boosts.ok) {
      const data = (await boosts.json()) as DexProfile[];
      for (const p of data) {
        if (p.chainId === "solana" && p.tokenAddress) out.add(p.tokenAddress);
      }
    }
    if (out.size === 0) FALLBACK_MINTS.forEach((m) => out.add(m));
    return [...out].slice(0, 25); // cap at 25 — DexScreener tokens batch limit ~30
  } catch {
    return FALLBACK_MINTS.slice();
  }
}

async function fetchTokensBatch(mints: string[]): Promise<DexPair[]> {
  if (mints.length === 0) return [];
  const res = await fetch(
    `https://api.dexscreener.com/latest/dex/tokens/${mints.join(",")}`,
    { next: { revalidate: 60 } }
  );
  if (!res.ok) throw new Error(`dexscreener tokens ${res.status}`);
  const data = (await res.json()) as { pairs?: DexPair[] | null };
  return data.pairs ?? [];
}

export async function GET() {
  try {
    const mints = await fetchTrendingMints();
    const pairs = await fetchTokensBatch(mints);

    // Per mint, keep the Solana pair with the highest 24h volume
    const bestByMint = new Map<string, DexPair>();
    for (const pair of pairs) {
      if (pair.chainId && pair.chainId !== "solana") continue;
      const mint = pair.baseToken?.address;
      if (!mint) continue;
      const existing = bestByMint.get(mint);
      const vol = pair.volume?.h24 ?? 0;
      const existingVol = existing?.volume?.h24 ?? 0;
      if (!existing || vol > existingVol) bestByMint.set(mint, pair);
    }

    const rows: HotTokenRow[] = [...bestByMint.entries()]
      .map(([mint, pair]) => ({
        ticker: pair.baseToken?.symbol ?? mint.slice(0, 4),
        mint,
        price_usd: pair.priceUsd ? parseFloat(pair.priceUsd) : null,
        mcap_usd: pair.marketCap ?? pair.fdv ?? null,
        change_1h: pair.priceChange?.h1 != null ? pair.priceChange.h1 / 100 : null,
        change_24h: pair.priceChange?.h24 != null ? pair.priceChange.h24 / 100 : null,
        volume_24h_usd: pair.volume?.h24 ?? null,
        liquidity_usd: pair.liquidity?.usd ?? null,
      }))
      // Require meaningful liquidity (rug filter) + meaningful volume
      .filter((r) => (r.liquidity_usd ?? 0) >= 3000 && (r.volume_24h_usd ?? 0) >= 5000)
      .sort((a, b) => (b.volume_24h_usd ?? 0) - (a.volume_24h_usd ?? 0))
      .slice(0, 15);

    return NextResponse.json(
      { generated_at: new Date().toISOString(), rows },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("hot-tokens error:", err);
    return NextResponse.json(
      {
        generated_at: new Date().toISOString(),
        rows: [],
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 200 }
    );
  }
}
