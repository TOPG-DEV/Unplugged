import { NextRequest, NextResponse } from "next/server";
import { ingestTrackerEvents } from "@/lib/tracker/ingest";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestTrackerEvents();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("cron tracker error:", err);
    return NextResponse.json(
      { error: "ingest failed", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
