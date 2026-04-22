import { webhookCallback } from "grammy";
import { NextResponse } from "next/server";
import { bot } from "@/lib/fuel/bot";
import { seenUpdate, markUpdateSeen } from "@/lib/fuel/memory";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const handler = webhookCallback(bot, "std/http", {
  secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
  // grammY verifies X-Telegram-Bot-Api-Secret-Token in constant-time internally.
});

export async function POST(req: Request) {
  let update: { update_id?: number } = {};
  try {
    const body = await req.clone().json();
    update = body ?? {};
  } catch {
    // Not JSON — let grammY handle the error path.
  }

  // Idempotency: short-circuit re-delivered update_ids (Pitfall FUEL-3).
  if (update.update_id != null) {
    if (await seenUpdate(update.update_id)) {
      return NextResponse.json({ ok: true, skipped: "duplicate" }, { status: 200 });
    }
    await markUpdateSeen(update.update_id).catch(() => {
      /* tolerated race */
    });
  }

  try {
    return await handler(req);
  } catch (err) {
    // Always 200 so Telegram stops retrying broken-handler cases (Pitfall FUEL-3).
    console.error("[fuel webhook] handler error:", err);
    return NextResponse.json({ ok: true, handled: false }, { status: 200 });
  }
}
