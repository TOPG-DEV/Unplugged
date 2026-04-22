import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Curated high-volume Solana mints. DexScreener batch-fetches by mint;
// the response is a flat pair list we pick the top pair from per mint.
// Replace / extend this list as the "hot" cohort shifts — no deploy
// needed if we move it to Mongo later.
const HOT_MINTS: { mint: string; ticker: string }[] = [
  { mint: "So11111111111111111111111111111111111111112", ticker: "SOL" },
  { mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", ticker: "BONK" },
  { mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", ticker: "WIF" },
  { mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", ticker: "JUP" },
  { mint: "6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN", ticker: "TRUMP" },
  { mint: "2qEHjDLDLbuBgRYvsxhc5D6uDWAivNFZGan56P1tpump", ticker: "PNUT" },
  { mint: "CzLSujWBLFsSjncfkh59rUFqvafWcY5tzedWJSuypump", ticker: "GOAT" },
  { mint: "MEFNBXixkEbait3xn9bkm8WsJzXtVsaJEn4c8Sam21u", ticker: "ME" },
];

interface DexPair {
  chainId?: string;
  baseToken?: { address?: string; symbol?: string };
  priceUsd?: string;
  priceChange?: { h1?: number; h24?: number };
  volume?: { h24?: number };
  liquidity?: { usd?: number };
}

interface HotTokenRow {
  ticker: string;
  mint: string;
  price_usd: number | null;
  change_1h: number | null;
  change_24h: number | null;
  volume_24h_usd: number | null;
}

export async function GET() {
  try {
    // DexScreener accepts comma-separated mints, returns all pairs
    const mintsCsv = HOT_MINTS.map((m) => m.mint).join(",");
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mintsCsv}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error(`dexscreener ${res.status}`);
    const data = (await res.json()) as { pairs?: DexPair[] | null };
    const pairs = data.pairs ?? [];

    // Per mint, pick the pair with highest liquidity on Solana
    const bestByMint = new Map<string, DexPair>();
    for (const pair of pairs) {
      if (pair.chainId && pair.chainId !== "solana") continue;
      const mint = pair.baseToken?.address;
      if (!mint) continue;
      const existing = bestByMint.get(mint);
      const liq = pair.liquidity?.usd ?? 0;
      const existingLiq = existing?.liquidity?.usd ?? 0;
      if (!existing || liq > existingLiq) bestByMint.set(mint, pair);
    }

    const rows: HotTokenRow[] = HOT_MINTS.map(({ mint, ticker }) => {
      const pair = bestByMint.get(mint);
      return {
        ticker,
        mint,
        price_usd: pair?.priceUsd ? parseFloat(pair.priceUsd) : null,
        change_1h: pair?.priceChange?.h1 != null ? pair.priceChange.h1 / 100 : null,
        change_24h: pair?.priceChange?.h24 != null ? pair.priceChange.h24 / 100 : null,
        volume_24h_usd: pair?.volume?.h24 ?? null,
      };
    }).sort((a, b) => (b.volume_24h_usd ?? 0) - (a.volume_24h_usd ?? 0));

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
      { generated_at: new Date().toISOString(), rows: [], error: err instanceof Error ? err.message : "unknown" },
      { status: 200 }
    );
  }
}
