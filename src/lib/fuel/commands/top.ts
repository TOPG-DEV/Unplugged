import clientPromise from "@/lib/mongo";
import { bookStats, callPnL } from "@/lib/scoring";
import { formatUsdCompact, formatPctSigned } from "@/lib/format";
import type { CallDoc } from "@/lib/types/call";
import type { CommandResult } from "@/lib/types/fuel";
import type { Context } from "grammy";

const DB = "unpluggedDB";

export async function handleTop(): Promise<CommandResult> {
  const client = await clientPromise;
  const db = client.db(DB);
  const closed = await db
    .collection<CallDoc>("calls")
    .find({ status: { $in: ["closed-win", "closed-loss", "stopped-out"] } })
    .toArray();

  if (closed.length === 0) {
    return { reply: "no closed calls yet. the book is still young.", parse_mode: "HTML" };
  }

  interface Winner {
    ticker: string;
    entry: number;
    close: number;
    pnl: number;
  }
  const winners: Winner[] = [];
  for (const c of closed) {
    // Pull the latest close_mcap from status_history (Phase 2/02.1 schema).
    const close = [...c.status_history].reverse().find((s) => s.close_mcap != null)?.close_mcap;
    if (close == null) continue;
    winners.push({
      ticker: c.ticker,
      entry: c.entry_mcap,
      close,
      pnl: callPnL(c.entry_mcap, close),
    });
  }
  winners.sort((a, b) => b.pnl - a.pnl);
  const top5 = winners.slice(0, 5);

  const stats = bookStats(closed);
  const header = `<b>top 5</b>  ·  ${stats.total} calls · ${Math.round(stats.winRate * 100)}% W · avg ${formatPctSigned(stats.avgPnL)}`;
  const lines = top5.map((w, i) => {
    const rank = String(i + 1).padStart(2, "0");
    return `<b>${rank}</b> $${w.ticker.toUpperCase()}  ${formatUsdCompact(w.entry)} → ${formatUsdCompact(w.close)}  <b>${formatPctSigned(w.pnl)}</b>`;
  });

  return {
    reply: [header, ``, ...lines].join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
}

export async function topRoute(ctx: Context): Promise<void> {
  const result = await handleTop();
  await ctx.reply(result.reply, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}
