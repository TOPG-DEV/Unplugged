// DexScreener client — liquidity, volume, pair age, price.
// Docs: https://docs.dexscreener.com/api/reference
// Rate: 300 rpm/IP (free). Returns null on any failure; caller decides fallback.

import type { DexScreenerData } from "@/lib/types/scanner";

export async function fetchDexScreenerData(
  mint: string
): Promise<DexScreenerData | null> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pairs?: Array<{
        priceUsd?: string;
        liquidity?: { usd?: number };
        volume?: { h24?: number };
        pairCreatedAt?: number;
        priceChange?: { h1?: number; h24?: number };
      }> | null;
    };
    const pair = data.pairs?.[0];
    if (!pair) return null;
    const now = Date.now();
    return {
      priceUsd: pair.priceUsd ? parseFloat(pair.priceUsd) : null,
      liquidityUsd: pair.liquidity?.usd ?? null,
      volume24hUsd: pair.volume?.h24 ?? null,
      pairAgeMs: pair.pairCreatedAt ? now - pair.pairCreatedAt : null,
      priceChange1h: pair.priceChange?.h1 ?? null,
      priceChange24h: pair.priceChange?.h24 ?? null,
    };
  } catch {
    return null;
  }
}
