#!/usr/bin/env node
// One-shot cleanup after the 02.1 mcap pivot. Drops `unpluggedDB.calls`
// (legacy schema with entry_price/target_price/stop_price fields, signed
// under the old CALL_FIELDS order) and `unpluggedDB.scan_cache` (10-min
// scanner cache — stale entries harmless but cheaper to wipe).
//
// Run once, before re-posting the first mcap-schema call:
//   MONGODB_URI="mongodb+srv://..." node scripts/cleanup-legacy-calls.mjs
//
// Idempotent: if the collections are already absent, the drops are no-ops.

import { MongoClient } from "mongodb";

const URI = process.env.MONGODB_URI;
if (!URI) {
  console.error("MONGODB_URI env var required");
  process.exit(1);
}

const DB_NAME = "unpluggedDB";
const COLLECTIONS = ["calls", "scan_cache"];

const client = new MongoClient(URI);

try {
  await client.connect();
  const db = client.db(DB_NAME);
  for (const name of COLLECTIONS) {
    try {
      const dropped = await db.collection(name).drop();
      console.log(`${dropped ? "dropped" : "no-op"}: ${DB_NAME}.${name}`);
    } catch (err) {
      if (err?.codeName === "NamespaceNotFound") {
        console.log(`no-op: ${DB_NAME}.${name} (already absent)`);
      } else {
        throw err;
      }
    }
  }
  console.log("cleanup complete");
} finally {
  await client.close();
}
