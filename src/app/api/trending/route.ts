import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongo";
import type { TrendingSnapshot, TrendingApiResponse } from "@/lib/types/trending";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("unpluggedDB");
    const snap = await db
      .collection<TrendingSnapshot>("trending_snapshot")
      .findOne({ _id: "current" });

    if (!snap) {
      return NextResponse.json(
        {
          generated_at: null,
          rows: [],
          stale_ms: null,
          note: "snapshot not ready — first cron tick pending",
        },
        { status: 200 }
      );
    }

    const generated_at = snap.generated_at.toISOString();
    const stale_ms = Date.now() - snap.generated_at.getTime();
    const body: TrendingApiResponse = {
      generated_at,
      rows: snap.rows ?? [],
      stale_ms,
    };
    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("trending read error:", err);
    return NextResponse.json(
      {
        error: "trending read failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
