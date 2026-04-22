import { NextResponse } from "next/server";
import { bot } from "@/lib/fuel/bot";

export const dynamic = "force-dynamic";

const WALLET_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function POST(req: Request) {
  let wallet: string | undefined;
  try {
    const body = await req.json();
    wallet = typeof body?.wallet === "string" ? body.wallet.trim() : undefined;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!wallet || !WALLET_REGEX.test(wallet)) {
    return NextResponse.json({ error: "wallet missing or malformed" }, { status: 400 });
  }

  // Pitfall FUEL-7: read allowlist AT REQUEST TIME, not at module init.
  // Vercel env is live at process.env access; only NEXT_PUBLIC_* are baked at build.
  const raw = process.env.FUEL_INVITE_WALLETS ?? "";
  const allowlist = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!allowlist.includes(wallet)) {
    // Do not leak allowlist contents.
    return NextResponse.json({ error: "not eligible" }, { status: 403 });
  }

  const chatIdRaw = process.env.TELEGRAM_GATED_GROUP_CHAT_ID;
  if (!chatIdRaw) {
    return NextResponse.json({ error: "invite destination not configured" }, { status: 503 });
  }
  const chatId = parseInt(chatIdRaw, 10);
  if (!Number.isFinite(chatId)) {
    return NextResponse.json({ error: "invalid chat id format" }, { status: 503 });
  }

  const expire_date = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  try {
    const invite = await bot.api.createChatInviteLink(chatId, {
      member_limit: 1,
      expire_date,
      name: `Unplugged · ${wallet.slice(0, 6)}`,
    });
    return NextResponse.json(
      { invite_link: invite.invite_link, expires_at: expire_date },
      { status: 200 }
    );
  } catch (err) {
    console.error("[fuel invite] createChatInviteLink error:", err);
    return NextResponse.json({ error: "invite creation failed" }, { status: 500 });
  }
}
