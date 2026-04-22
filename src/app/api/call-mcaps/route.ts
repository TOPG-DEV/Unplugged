import { NextRequest, NextResponse } from "next/server";
import { fetchMcaps } from "@/lib/prices";

const MAX_MINTS = 50;

/**
 * Batch market-cap lookup for Wire + Book consumers after the 02.1 mcap pivot.
 * GET /api/call-mcaps?mints=<csv>
 *
 * Returns { mcaps: { [mint]: usdMcap } }. Mints DexScreener doesn't have
 * are absent from the response.
 */
export async function GET(req: NextRequest) {
  const mintsParam = req.nextUrl.searchParams.get("mints");
  if (!mintsParam) {
    return NextResponse.json({ error: "mints required" }, { status: 400 });
  }
  const mints = mintsParam
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, MAX_MINTS);

  if (mints.length === 0) {
    return NextResponse.json({ mcaps: {} });
  }

  const mcaps = await fetchMcaps(mints);
  return NextResponse.json({ mcaps });
}
