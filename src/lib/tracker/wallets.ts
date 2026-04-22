import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TrackedWallet } from "@/lib/types/tracker";

function parseMarkdownTable(md: string): TrackedWallet[] {
  const rows: TrackedWallet[] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^\|\s*(\S[^|]*?)\s*\|\s*`([1-9A-HJ-NP-Za-km-z]{32,44})`\s*\|/);
    if (m) rows.push({ alias: m[1].trim(), pubkey: m[2] });
  }
  return rows;
}

export function getTrackedWallets(): TrackedWallet[] {
  let list: TrackedWallet[] = [];

  if (process.env.TRACKED_WALLETS) {
    try {
      const parsed = JSON.parse(process.env.TRACKED_WALLETS) as TrackedWallet[];
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }

  if (list.length === 0) {
    try {
      const path = join(process.cwd(), ".planning/ops/tracked-wallets.md");
      list = parseMarkdownTable(readFileSync(path, "utf8"));
    } catch {
      list = [];
    }
  }

  const kc = process.env.NEXT_PUBLIC_KC_CALL_WALLET;
  if (kc && !list.some((w) => w.pubkey === kc)) {
    list.push({ alias: "KC", pubkey: kc });
  }

  return list;
}
