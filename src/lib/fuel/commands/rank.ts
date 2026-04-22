import type { CommandResult } from "@/lib/types/fuel";
import type { Context } from "grammy";

// D-12: /rank is retired. Command stays registered so users typing it
// don't see "unknown command", but is NOT in the @BotFather menu.
export async function handleRank(): Promise<CommandResult> {
  return {
    reply:
      "<code>/rank</code> retired — see /top for KC's closed winners, or the book on the site for the full record.",
    parse_mode: "HTML",
  };
}

export async function rankRoute(ctx: Context): Promise<void> {
  const r = await handleRank();
  await ctx.reply(r.reply, { parse_mode: "HTML" });
}
