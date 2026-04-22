import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "wallet required" }, { status: 400 });
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
      note: "Wired up in Phase 2+ for Pass verification (PASS-01 / GATE-01)",
    },
    { status: 501 }
  );
}

export async function POST() {
  return NextResponse.json({ error: "not implemented" }, { status: 501 });
}
