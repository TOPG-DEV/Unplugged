import clientPromise from "@/lib/mongo";
import { callPnL } from "@/lib/scoring";
import { fetchMcaps } from "@/lib/prices";
import { formatUsdCompact, formatPctSigned } from "@/lib/format";
import type { CallDoc } from "@/lib/types/call";
import type { CommandResult } from "@/lib/types/fuel";
import type { Context } from "grammy";

const DB = "unpluggedDB";

export async function handleCall(): Promise<CommandResult> {
  const client = await clientPromise;
  const db = client.db(DB);
  const latest = await db
    .collection<CallDoc>("calls")
    .find({ status: "open" })
    .sort({ created_at: -1 })
    .limit(1)
    .toArray();

  if (latest.length === 0) {
    return { reply: "no open calls right now. hit /top for the closed winners.", parse_mode: "HTML" };
  }

  const call = latest[0];
  const mcaps = await fetchMcaps([call.mint]);
  const current = mcaps[call.mint] ?? null;
  const pnl = current != null ? callPnL(call.entry_mcap, current) : null;

  const lines = [
    `<b>$${call.ticker.toUpperCase()}</b>  ·  open`,
    `entry ${formatUsdCompact(call.entry_mcap)}  →  target ${formatUsdCompact(call.target_mcap)}${call.stop_mcap != null ? `  ·  stop ${formatUsdCompact(call.stop_mcap)}` : ""}`,
    current != null
      ? `now ${formatUsdCompact(current)}  ·  pnl ${pnl != null ? formatPctSigned(pnl) : "—"}`
      : "mcap unavailable (dexscreener returned nothing)",
    call.thesis ? `<i>${escapeHtml(call.thesis.slice(0, 240))}</i>` : "",
  ].filter(Boolean);

  return { reply: lines.join("\n"), parse_mode: "HTML", disable_web_page_preview: true };
}

export async function callRoute(ctx: Context): Promise<void> {
  const result = await handleCall();
  await ctx.reply(result.reply, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
