// Rugcheck client — LP lock, mint renounced, top-10 holders, honeypot flag.
// Free tier: ~30 rpm per IP. Caller MUST use scan_cache wrapper (10 min TTL).

import type { Light, RugcheckData } from "@/lib/types/scanner";

const HONEYPOT_PATTERNS = /honeypot|blacklist|pausable|mint authority still present/i;

export async function fetchRugcheckData(
  mint: string
): Promise<RugcheckData | null> {
  const url = `https://api.rugcheck.xyz/v1/tokens/${mint}/report`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      mintAuthority?: string | null;
      topHolders?: Array<{ pct?: number }>;
      risks?: Array<{ name: string; level: string }>;
      markets?: Array<{ lp?: { lpLockedPct?: number } }>;
    };

    const mintRenounced = data.mintAuthority === null;
    const top10 = (data.topHolders || [])
      .slice(0, 10)
      .reduce((a, h) => a + (h.pct ?? 0), 0);
    const top10HolderPct = top10 || null;
    const risks = (data.risks || []).filter(
      (r): r is { name: string; level: "warn" | "danger" } =>
        r.level === "warn" || r.level === "danger"
    );
    const honeypotFlag = risks.some(
      (r) => r.level === "danger" && HONEYPOT_PATTERNS.test(r.name)
    );

    // LP lock heuristic: best pair's lpLockedPct > 80 → green; 40-80 → yellow; else red.
    const lpPct = data.markets?.[0]?.lp?.lpLockedPct ?? null;
    let lpLocked: Light = "unknown";
    if (lpPct != null) {
      if (lpPct >= 80) lpLocked = "green";
      else if (lpPct >= 40) lpLocked = "yellow";
      else lpLocked = "red";
    }

    return { mintRenounced, lpLocked, top10HolderPct, honeypotFlag, risks };
  } catch {
    return null;
  }
}
