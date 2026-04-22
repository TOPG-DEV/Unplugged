import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  const mint = req.nextUrl.searchParams.get("mint");
  if (!wallet || !mint) {
    return NextResponse.json(
      { error: "wallet and mint required" },
      { status: 400 }
    );
  }
  if (!process.env.HELIUS_API_KEY) {
    return NextResponse.json(
      { error: "server misconfigured: HELIUS_API_KEY missing" },
      { status: 500 }
    );
  }
  return NextResponse.json(
    {
      stub: true,
      wallet,
      mint,
      note: "Wired up in Phase 2+ for SPL token balance reads",
    },
    { status: 501 }
  );
}
