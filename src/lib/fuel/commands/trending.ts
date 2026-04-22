import clientPromise from "@/lib/mongo";
import { formatUsdCompact, formatPctSigned } from "@/lib/format";
import type { TrendingSnapshot, SignalBadge } from "@/lib/types/trending";
import type { CommandResult } from "@/lib/types/fuel";
import type { Context } from "grammy";

const DB = "unpluggedDB";

const BADGE_GLYPH: Record<SignalBadge, string> = {
  SMART_MONEY: "🟢",
  BUNDLE_RISK: "💥",
  TOP10_WINNING: "📈",
  TOP10_UNDERWATER: "📉",
  TOP10_MIXED: "〰️",
  NEW_PAIR: "⚠️",
  UNSAFE: "🚨",
  LOW_VOL: "⏳",
};

export async function handleTrending(): Promise<CommandResult> {
  const client = await clientPromise;
  const db = client.db(DB);
  const snap = await db
    .collection<TrendingSnapshot>("trending_snapshot")
    .findOne({ _id: "current" });

  if (!snap || !snap.rows || snap.rows.length === 0) {
    return {
      reply: "trending not ready yet. cron rolls every 5 min. try again in a bit.",
      parse_mode: "HTML",
    };
  }

  const top5 = snap.rows.slice(0, 5);
  const ageMs = Date.now() - snap.generated_at.getTime();
  const ageLabel = ageMs < 120_000 ? "just now" : `${Math.floor(ageMs / 60_000)}m ago`;

  const lines = top5.map((r) => {
    const rank = String(r.rank).padStart(2, "0");
    const badges = r.badges.map((b) => BADGE_GLYPH[b]).join("");
    const change = r.pct_change_1h != null ? formatPctSigned(r.pct_change_1h) : "—";
    const priceDisplay = formatUsdCompact(r.mcap_usd ?? r.price_usd);
    return `<b>${rank}</b> ${r.ticker}  ${priceDisplay}  ${change}  ${badges}`;
  });

  return {
    reply: [
      `<b>trending</b> · top 5 · ${ageLabel}`,
      ``,
      ...lines,
      ``,
      `full top-10 + inline scans → the site`,
    ].join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
}

export async function trendingRoute(ctx: Context): Promise<void> {
  const result = await handleTrending();
  await ctx.reply(result.reply, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}
