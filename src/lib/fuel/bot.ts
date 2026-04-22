import { Bot } from "grammy";
import { callRoute } from "./commands/call";
import { trackRoute } from "./commands/track";
import { scanRoute } from "./commands/scan";
import { trendingRoute } from "./commands/trending";
import { topRoute } from "./commands/top";
import { passRoute } from "./commands/pass";
import { rankRoute } from "./commands/rank";
import { briefingRoute } from "./commands/briefing";
import { fuelReply } from "./claude";
import { loadMemory, appendTurns } from "./memory";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  // Don't throw at module-init — routes that don't need the bot shouldn't crash.
  console.warn("[fuel] TELEGRAM_BOT_TOKEN missing — bot commands will fail at runtime");
}

export const bot = new Bot(token ?? "placeholder-token-will-fail-at-runtime");

// 6 live commands (D-11)
bot.command("call", callRoute);
bot.command("track", trackRoute);
bot.command("scan", scanRoute);
bot.command("trending", trendingRoute);
bot.command("top", topRoute);
bot.command("pass", passRoute);

// 2 legacy/deferred — registered for grammY's parser, NOT in @BotFather menu
bot.command("rank", rankRoute); // D-12 retired
bot.command("briefing", briefingRoute); // D-13 deferred

// Free-chat catch-all — only fires on message:text that is NOT a registered command
bot.on("message:text", async (ctx) => {
  // Unknown slash-prefixed → templated reply, no Claude spend
  if (ctx.message.text.startsWith("/")) {
    await ctx.reply("not a command i know. try /call /track /scan /trending /top /pass.", {
      parse_mode: "HTML",
    });
    return;
  }
  const user_id = String(ctx.from?.id ?? "");
  if (!user_id) return;
  const username = ctx.from?.username ?? null;

  try {
    const history = await loadMemory(user_id);
    const reply = await fuelReply(ctx.message.text, history);
    const final = reply || "brain isn't connected right now. try /call /scan /trending.";
    await ctx.reply(final, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
    await appendTurns(user_id, username, [
      { role: "user", content: ctx.message.text, ts: Date.now() },
      { role: "assistant", content: final, ts: Date.now() },
    ]);
  } catch (err) {
    console.error("[fuel] free-chat error:", err);
    await ctx.reply(
      "brain offline. try a command: /call /track /scan /trending /top /pass.",
      { parse_mode: "HTML" }
    );
  }
});

bot.catch((err) => {
  console.error("[fuel] unhandled bot error:", err.error);
});
