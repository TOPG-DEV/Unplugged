import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TrackedWallet } from "@/lib/types/tracker";
import { getTrackedWallets } from "@/lib/tracker/wallets";

function parseMarkdownTable(md: string): TrackedWallet[] {
  const rows: TrackedWallet[] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^\|\s*(\S[^|]*?)\s*\|\s*`([1-9A-HJ-NP-Za-km-z]{32,44})`\s*\|/);
    if (m) rows.push({ alias: m[1].trim(), pubkey: m[2] });
  }
  return rows;
}

function readKolFile(): TrackedWallet[] {
  if (process.env.KOL_WALLETS) {
    try {
      const parsed = JSON.parse(process.env.KOL_WALLETS) as TrackedWallet[];
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* fall through to file */
    }
  }
  try {
    const path = join(process.cwd(), ".planning/ops/kol-wallets.md");
    return parseMarkdownTable(readFileSync(path, "utf8"));
  } catch {
    return [];
  }
}

/**
 * Union of tracked wallets (Phase 2) + KOL wallets (Phase 3). Dedupes on pubkey.
 * First occurrence wins for alias collisions, so tracked-wallet aliases take priority.
 */
export function getSmartMoneyWallets(): TrackedWallet[] {
  const tracked = getTrackedWallets();
  const kol = readKolFile();
  const seen = new Set<string>();
  const out: TrackedWallet[] = [];
  for (const w of [...tracked, ...kol]) {
    if (seen.has(w.pubkey)) continue;
    seen.add(w.pubkey);
    out.push(w);
  }
  return out;
}
