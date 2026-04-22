import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.HELIUS_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "server misconfigured: HELIUS_WEBHOOK_SECRET missing" },
      { status: 500 }
    );
  }

  if (auth !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // TODO (Phase 2 / TRACK-01): parse payload, validate event shape,
  // insert into `tracker_events` collection.
  return NextResponse.json(
    {
      stub: true,
      note: "Auth passes. Payload handling wired up in Phase 2 TRACK-01.",
    },
    { status: 501 }
  );
}
