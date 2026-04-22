// Price + mcap fetch.
// Prices: Jupiter primary, DexScreener fallback (unchanged).
// Mcaps:  DexScreener only — Jupiter doesn't surface supply.
// Both use 30s per-mint caches.

interface CacheEntry {
  price: number;
  source: "jupiter" | "dexscreener";
  cached_at: number;
}

interface McapCacheEntry {
  mcap: number;
  cached_at: number;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();
const mcapCache = new Map<string, McapCacheEntry>();

async function fetchJupiter(mints: string[]): Promise<Record<string, number>> {
  if (mints.length === 0) return {};
  const url = `https://lite-api.jup.ag/price/v3?ids=${mints.join(",")}`;
  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, { usdPrice?: number }>;
    const out: Record<string, number> = {};
    for (const [mint, v] of Object.entries(data)) {
      if (v?.usdPrice != null) out[mint] = v.usdPrice;
    }
    return out;
  } catch {
    return {};
  }
}

async function fetchDexScreener(mint: string): Promise<number | null> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pairs?: Array<{ priceUsd?: string }> | null;
    };
    const pair = data.pairs?.[0];
    if (!pair?.priceUsd) return null;
    const n = parseFloat(pair.priceUsd);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Fetch prices for multiple mints.  Jupiter batch first, DexScreener per-mint
 * fallback for mints Jupiter didn't return.  Cached 30s per mint.
 *
 * Returns a partial record — mints with no price (neither source has them)
 * are simply absent from the response.
 */
export async function fetchPrices(
  mints: string[]
): Promise<Record<string, number>> {
  const now = Date.now();
  const out: Record<string, number> = {};
  const needed: string[] = [];

  for (const mint of mints) {
    const c = cache.get(mint);
    if (c && now - c.cached_at < CACHE_TTL_MS) {
      out[mint] = c.price;
    } else {
      needed.push(mint);
    }
  }
  if (needed.length === 0) return out;

  const jup = await fetchJupiter(needed);
  for (const [mint, price] of Object.entries(jup)) {
    out[mint] = price;
    cache.set(mint, { price, source: "jupiter", cached_at: now });
  }

  const missing = needed.filter((m) => !(m in jup));
  await Promise.all(
    missing.map(async (mint) => {
      const price = await fetchDexScreener(mint);
      if (price != null) {
        out[mint] = price;
        cache.set(mint, { price, source: "dexscreener", cached_at: now });
      }
    })
  );

  return out;
}

async function fetchDexScreenerMcap(mint: string): Promise<number | null> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
  try {
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      pairs?: Array<{ marketCap?: number; fdv?: number }> | null;
    };
    // DexScreener orders pairs by liquidity desc; the first one with a
    // marketCap value is the canonical reference. fdv fallback covers
    // pre-circulation tokens where marketCap is unset.
    for (const pair of data.pairs ?? []) {
      if (pair.marketCap != null && Number.isFinite(pair.marketCap)) {
        return pair.marketCap;
      }
    }
    for (const pair of data.pairs ?? []) {
      if (pair.fdv != null && Number.isFinite(pair.fdv)) {
        return pair.fdv;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch USD market cap for multiple mints via DexScreener.  30s cache.
 * Mints DexScreener doesn't have are absent from the response — callers
 * should fall back to displaying `—`, not throw.
 */
export async function fetchMcaps(
  mints: string[]
): Promise<Record<string, number>> {
  const now = Date.now();
  const out: Record<string, number> = {};
  const needed: string[] = [];

  for (const mint of mints) {
    const c = mcapCache.get(mint);
    if (c && now - c.cached_at < CACHE_TTL_MS) {
      out[mint] = c.mcap;
    } else {
      needed.push(mint);
    }
  }
  if (needed.length === 0) return out;

  await Promise.all(
    needed.map(async (mint) => {
      const mcap = await fetchDexScreenerMcap(mint);
      if (mcap != null) {
        out[mint] = mcap;
        mcapCache.set(mint, { mcap, cached_at: now });
      }
    })
  );

  return out;
}
