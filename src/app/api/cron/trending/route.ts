import { NextRequest, NextResponse } from "next/server";
import { ingestTrending } from "@/lib/trending/aggregator";

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
    const result = await ingestTrending();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("cron trending error:", err);
    return NextResponse.json(
      { error: "trending ingest failed", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
