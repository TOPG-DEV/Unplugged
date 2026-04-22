#!/usr/bin/env node
// Local-dev tracker poller. Run alongside `npm run dev`:
//     CRON_SECRET=<value> node scripts/run-tracker-cron.mjs
// Hits /api/cron/tracker every 60s.

import cron from "node-cron";

const SECRET = process.env.CRON_SECRET;
const URL = process.env.TRACKER_URL || "http://localhost:3000/api/cron/tracker";

if (!SECRET) {
  console.error("CRON_SECRET env var required");
  process.exit(1);
}

async function tick() {
  try {
    const res = await fetch(URL, {
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    const body = await res.text();
    console.log(`[${new Date().toISOString()}] ${res.status}: ${body}`);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] fetch failed:`, err.message);
  }
}

console.log(`tracker cron started — target: ${URL}`);
tick();
cron.schedule("*/60 * * * * *", tick);
