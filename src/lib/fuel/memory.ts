import clientPromise from "@/lib/mongo";
import type { FuelTurn, FuelMemoryDoc, FuelSeenUpdateDoc } from "@/lib/types/fuel";

const DB = "unpluggedDB";
const COL_MEMORY = "fuel_memory";
const COL_SEEN = "fuel_seen_updates";
const TURN_CAP = 20;
const MEMORY_TTL_S = 30 * 24 * 60 * 60;  // 30d
const SEEN_TTL_S = 90;                    // 90s — just past Telegram's re-delivery window

let indexesReady = false;
async function ensureIndexes(): Promise<void> {
  if (indexesReady) return;
  const client = await clientPromise;
  const db = client.db(DB);
  await db.collection<FuelMemoryDoc>(COL_MEMORY).createIndex({ user_id: 1 }, { unique: true });
  await db.collection<FuelMemoryDoc>(COL_MEMORY).createIndex({ updated_at: 1 }, { expireAfterSeconds: MEMORY_TTL_S });
  await db.collection<FuelSeenUpdateDoc>(COL_SEEN).createIndex({ update_id: 1 }, { unique: true });
  await db.collection<FuelSeenUpdateDoc>(COL_SEEN).createIndex({ seen_at: 1 }, { expireAfterSeconds: SEEN_TTL_S });
  indexesReady = true;
}

export async function loadMemory(user_id: string): Promise<FuelTurn[]> {
  await ensureIndexes();
  const client = await clientPromise;
  const db = client.db(DB);
  const doc = await db.collection<FuelMemoryDoc>(COL_MEMORY).findOne({ user_id });
  return doc?.turns ?? [];
}

export async function appendTurns(
  user_id: string,
  username: string | null,
  newTurns: FuelTurn[]
): Promise<void> {
  if (newTurns.length === 0) return;
  await ensureIndexes();
  const client = await clientPromise;
  const db = client.db(DB);
  const now = new Date();
  await db.collection<FuelMemoryDoc>(COL_MEMORY).updateOne(
    { user_id },
    {
      $push: { turns: { $each: newTurns, $slice: -TURN_CAP } },
      $set: { updated_at: now, username },
      $setOnInsert: { first_seen: now },
    },
    { upsert: true }
  );
}

/**
 * Idempotency guard for Telegram webhook re-delivery.
 * Returns true if this update_id was already seen within the TTL window.
 */
export async function seenUpdate(update_id: number): Promise<boolean> {
  await ensureIndexes();
  const client = await clientPromise;
  const db = client.db(DB);
  const existing = await db.collection<FuelSeenUpdateDoc>(COL_SEEN).findOne({ update_id });
  return existing != null;
}

export async function markUpdateSeen(update_id: number): Promise<void> {
  await ensureIndexes();
  const client = await clientPromise;
  const db = client.db(DB);
  try {
    await db.collection<FuelSeenUpdateDoc>(COL_SEEN).insertOne({ update_id, seen_at: new Date() });
  } catch (err) {
    // Duplicate key on update_id is expected under re-delivery races — swallow.
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("E11000")) throw err;
  }
}
