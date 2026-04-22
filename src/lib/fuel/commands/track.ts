import clientPromise from "@/lib/mongo";
import { formatSolAmount, truncateMint } from "@/lib/format";
import type { TrackerEvent } from "@/lib/types/tracker";
import type { CommandResult } from "@/lib/types/fuel";
import type { Context } from "grammy";

const DB = "unpluggedDB";

function ageLabel(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

export async function handleTrack(): Promise<CommandResult> {
  const client = await clientPromise;
  const db = client.db(DB);
  const events = await db
    .collection<TrackerEvent>("tracker_events")
    .find({})
    .sort({ timestamp: -1 })
    .limit(10)
    .toArray();

  if (events.length === 0) {
    return { reply: "no tracker events yet. watching...", parse_mode: "HTML" };
  }

  const now = Date.now();
  const lines = events.map((e) => {
    const glyph = e.direction === "buy" ? "🟢" : "🔴";
    const ticker = e.ticker
      ? `$${e.ticker.toUpperCase()}`
      : `<code>${truncateMint(e.mint)}</code>`;
    // tracker_events.timestamp is stored as unix seconds (Helius convention)
    const eventMs = (e.timestamp ?? 0) * 1000;
    return `${glyph} <b>${escapeHtml(e.wallet_alias)}</b> ${e.direction} ${ticker} · ${formatSolAmount(e.sol_amount)} SOL · ${ageLabel(now - eventMs)} ago`;
  });

  return {
    reply: `<b>track</b> · last ${events.length}\n\n${lines.join("\n")}`,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
}

export async function trackRoute(ctx: Context): Promise<void> {
  const result = await handleTrack();
  await ctx.reply(result.reply, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
