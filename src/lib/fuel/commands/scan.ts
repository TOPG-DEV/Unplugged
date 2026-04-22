import clientPromise from "@/lib/mongo";
import { fetchDexScreenerData } from "@/lib/scanner/dexscreener";
import { fetchRugcheckData } from "@/lib/scanner/rugcheck";
import { formatUsdCompact, truncateMint } from "@/lib/format";
import type { CommandResult } from "@/lib/types/fuel";
import type { Context } from "grammy";

const MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const RATE_LIMIT_MS = 60_000;
const RATE_LIMIT_CALLS = 5;

interface ScanRateDoc {
  user_id: string;
  recent: Date[];
}

async function checkRateLimit(user_id: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("unpluggedDB");
  const col = db.collection<ScanRateDoc>("fuel_scan_rate");
  await col.createIndex({ user_id: 1 }, { unique: true });
  const cutoff = new Date(Date.now() - RATE_LIMIT_MS);
  const doc = await col.findOne({ user_id });
  const fresh = (doc?.recent ?? []).filter((d) => new Date(d) >= cutoff);
  if (fresh.length >= RATE_LIMIT_CALLS) return false;
  fresh.push(new Date());
  await col.updateOne({ user_id }, { $set: { recent: fresh.slice(-RATE_LIMIT_CALLS) } }, { upsert: true });
  return true;
}

function ageLabel(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

export async function handleScan(
  user_id: string,
  mintArg: string | undefined
): Promise<CommandResult> {
  if (!mintArg || !MINT_REGEX.test(mintArg.trim())) {
    return {
      reply: "usage: <code>/scan &lt;mint&gt;</code>\n\npaste a base58 spl mint (32–44 chars).",
      parse_mode: "HTML",
    };
  }
  const mint = mintArg.trim();
  const allowed = await checkRateLimit(user_id);
  if (!allowed) {
    return { reply: "⏳ rate-limited. 5 scans/min. try again in a bit.", parse_mode: "HTML" };
  }

  const [dex, rug] = await Promise.allSettled([
    fetchDexScreenerData(mint),
    fetchRugcheckData(mint),
  ]);
  const dexData = dex.status === "fulfilled" ? dex.value : null;
  const rugData = rug.status === "fulfilled" ? rug.value : null;

  // Scanner clients return flat summaries; ticker isn't available from
  // these summaries, so we fall back to truncated mint for the header row.
  const identifier = truncateMint(mint);

  // 4 lights mapped from the Phase 2 scanner's 4-light summary:
  // - honeypotFlag (boolean) → 🟢 if explicitly false, 🔴 if true, ⚪ unknown
  // - lpLocked (Light enum) → use it directly
  // - top10HolderPct (number) → 🟢 if <40%, 🔴 if >60%, ⚠ mixed 40-60
  // - pairAgeMs (number) → 🟢 if >1h, 🔴 if <15m, ⏳ in between
  const honeypotLight =
    rugData?.honeypotFlag === false ? "🟢" : rugData?.honeypotFlag === true ? "🔴" : "⚪";
  const lpLight =
    rugData?.lpLocked === "green"
      ? "🟢"
      : rugData?.lpLocked === "yellow"
        ? "⚠️"
        : rugData?.lpLocked === "red"
          ? "🔴"
          : "⚪";
  const top10Pct = rugData?.top10HolderPct ?? null;
  const top10Light =
    top10Pct == null ? "⚪" : top10Pct > 60 ? "🔴" : top10Pct >= 40 ? "⚠️" : "🟢";
  const ageMs = dexData?.pairAgeMs ?? null;
  const ageLight =
    ageMs == null ? "⚪" : ageMs < 15 * 60_000 ? "🔴" : ageMs < 60 * 60_000 ? "⚠️" : "🟢";

  const lights = [
    `${honeypotLight} honeypot`,
    `${lpLight} lp-lock`,
    `${top10Light} top10`,
    `${ageLight} age`,
  ];

  return {
    reply: [
      `<b>scan</b> · <code>${identifier}</code>`,
      ``,
      lights.join("  ·  "),
      ``,
      `lp ${formatUsdCompact(dexData?.liquidityUsd ?? null)}  ·  24h vol ${formatUsdCompact(dexData?.volume24hUsd ?? null)}  ·  top10 ${top10Pct != null ? top10Pct.toFixed(0) + "%" : "—"}  ·  age ${ageLabel(ageMs)}`,
    ].join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
}

export async function scanRoute(ctx: Context): Promise<void> {
  const user_id = String(ctx.from?.id ?? "unknown");
  const mint = ctx.match ? String(ctx.match).trim() : undefined;
  const result = await handleScan(user_id, mint);
  await ctx.reply(result.reply, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}
