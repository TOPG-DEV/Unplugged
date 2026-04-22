// GET /api/scan/:mint — 4-light scanner readout.
// Flow: validate base58 → cache read → on miss, parallel DexScreener +
// Rugcheck fetch → cache write → respond.

import { NextResponse } from "next/server";
import { fetchDexScreenerData } from "@/lib/scanner/dexscreener";
import { fetchRugcheckData } from "@/lib/scanner/rugcheck";
import { getScanCached, setScanCached } from "@/lib/scanner/cache";
import type { ScanResult } from "@/lib/types/scanner";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;
  if (!mint || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)) {
    return NextResponse.json({ error: "invalid mint" }, { status: 400 });
  }

  const cached = await getScanCached(mint);
  if (cached) return NextResponse.json(cached);

  const [dex, rug] = await Promise.all([
    fetchDexScreenerData(mint),
    fetchRugcheckData(mint),
  ]);

  const result: ScanResult = {
    mint,
    dexscreener: dex,
    rugcheck: rug,
    cached_at: new Date().toISOString(),
    sources: {
      dexscreener: dex ? "ok" : "error",
      rugcheck: rug ? "ok" : "error",
    },
  };

  await setScanCached(result).catch(() => {});

  return NextResponse.json(result);
}
