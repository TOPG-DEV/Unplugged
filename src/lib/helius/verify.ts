// Helius verification pattern extracted from v1 unplugged-info route.
// Phase 2+ wires this into the new /api/verify-wallet route (from Plan 01-02 stubs).
// See .planning/phases/01-foundation/01-CONTEXT.md D-19.

const HELIUS_BASE = "https://api.helius.xyz/v0";

export interface NativeTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  amount: number;
}

export interface HeliusTx {
  signature: string;
  nativeTransfers?: NativeTransfer[];
  timestamp: number;
}

/**
 * Returns Helius-formatted transactions for an address (last N).
 * Server-only — reads HELIUS_API_KEY from env. Never call this from client code.
 * See 01-RESEARCH.md for why the key must stay server-only.
 */
export async function fetchTransactions(
  address: string,
  limit = 100
): Promise<HeliusTx[]> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) throw new Error("HELIUS_API_KEY not configured");

  const url = `${HELIUS_BASE}/addresses/${address}/transactions?api-key=${key}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Helius API error: ${res.status} - ${text}`);
  }
  const data = (await res.json()) as HeliusTx[];
  return Array.isArray(data) ? data : [];
}

/**
 * Returns true if `fromWallet` has sent a native SOL transfer to `toWallet`
 * in the last `limit` transactions on `toWallet`.
 *
 * Caveat (see .planning/codebase/CONCERNS.md): this only scans the last N
 * transactions. Once `toWallet` exceeds N transactions, earliest payers
 * silently drop off. Phase 2+ will persist verification at write-time
 * instead of relying on this transactional lookup for every read.
 */
export async function hasSentNativeTransfer(
  fromWallet: string,
  toWallet: string,
  limit = 100
): Promise<boolean> {
  const txs = await fetchTransactions(toWallet, limit);
  for (const tx of txs) {
    for (const t of tx.nativeTransfers ?? []) {
      if (t.toUserAccount === toWallet && t.fromUserAccount === fromWallet) {
        return true;
      }
    }
  }
  return false;
}

// TODO(Phase 2): add signature-based verification — fetch a specific tx signature and
// assert recipient + lamports ≥ expected. More robust than scanning recipient history.
