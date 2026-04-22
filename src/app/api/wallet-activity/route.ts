import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";

export async function GET(req: NextRequest) {
  const limitParam = req.nextUrl.searchParams.get("limit");
  const parsed = parseInt(limitParam || "50", 10);
  const limit = Math.min(Number.isFinite(parsed) && parsed > 0 ? parsed : 50, 200);

  try {
    const client = await clientPromise;
    const db = client.db("unpluggedDB");
    const events = await db
      .collection("tracker_events")
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    return NextResponse.json({ events });
  } catch (err) {
    console.error("wallet-activity error:", err);
    return NextResponse.json(
      { error: "read failed", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
