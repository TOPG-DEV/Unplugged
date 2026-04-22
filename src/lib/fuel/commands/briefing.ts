import type { CommandResult } from "@/lib/types/fuel";
import type { Context } from "grammy";

// D-13: /briefing is AI-03, deferred to Phase 4+. Command stays
// registered for consistency.
export async function handleBriefing(): Promise<CommandResult> {
  return {
    reply: "daily briefing arrives in v1b. for now: /trending, /top, /call.",
    parse_mode: "HTML",
  };
}

export async function briefingRoute(ctx: Context): Promise<void> {
  const r = await handleBriefing();
  await ctx.reply(r.reply, { parse_mode: "HTML" });
}
