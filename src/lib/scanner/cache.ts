// Mongo-backed 10-minute per-mint cache for Scanner results.
// Collection: unpluggedDB.scan_cache
//   - unique index on mint (upsert target)
//   - TTL index on cached_at (auto-expire after 600s)

import clientPromise from "@/lib/mongo";
import type { ScanResult } from "@/lib/types/scanner";

const TTL_MS = 10 * 60 * 1000;

interface ScanCacheDoc {
  mint: string;
  result: ScanResult;
  cached_at: Date;
}

export async function getScanCached(mint: string): Promise<ScanResult | null> {
  const client = await clientPromise;
  const coll = client.db("unpluggedDB").collection<ScanCacheDoc>("scan_cache");
  const doc = await coll.findOne({ mint });
  if (!doc) return null;
  if (Date.now() - doc.cached_at.getTime() > TTL_MS) return null;
  return doc.result;
}

export async function setScanCached(result: ScanResult): Promise<void> {
  const client = await clientPromise;
  const coll = client.db("unpluggedDB").collection<ScanCacheDoc>("scan_cache");
  await coll.updateOne(
    { mint: result.mint },
    { $set: { mint: result.mint, result, cached_at: new Date() } },
    { upsert: true }
  );
  await coll
    .createIndex({ cached_at: 1 }, { expireAfterSeconds: 600 })
    .catch(() => {});
  await coll.createIndex({ mint: 1 }, { unique: true }).catch(() => {});
}
