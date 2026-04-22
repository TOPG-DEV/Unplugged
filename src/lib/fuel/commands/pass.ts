import type { CommandResult } from "@/lib/types/fuel";
import type { Context } from "grammy";

export async function handlePass(): Promise<CommandResult> {
  return {
    reply: [
      "<b>access</b>",
      "",
      "unplugged is wallet-allowlisted. no nft, no mint, no tokenomics puzzle.",
      "operator curates the list. v1 og contributors + vouched operators.",
      "",
      "already on the list? connect wallet on the site and click Join the gated group.",
      "not on the list? DM the operator.",
    ].join("\n"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
}

export async function passRoute(ctx: Context): Promise<void> {
  const r = await handlePass();
  await ctx.reply(r.reply, {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}
