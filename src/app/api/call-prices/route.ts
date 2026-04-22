import { NextRequest, NextResponse } from "next/server";
import { fetchPrices } from "@/lib/prices";

const MAX_MINTS = 50;

/**
 * Batch price lookup for the Wire + Book consumers.
 * GET /api/call-prices?mints=<csv>
 *
 * Returns { prices: { [mint]: usdPrice } }. Mints with no price
 * (neither Jupiter nor DexScreener has them) are absent from the response.
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
    return NextResponse.json({ prices: {} });
  }

  const prices = await fetchPrices(mints);
  return NextResponse.json({ prices });
}
