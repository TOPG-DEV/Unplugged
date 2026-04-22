import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo";
import { verifyCallSignature } from "@/lib/sig";
import type { CallBody, CallStatus } from "@/lib/types/call";

const VALID_STATUSES: CallStatus[] = [
  "open",
  "closed-win",
  "closed-loss",
  "stopped-out",
  "closed-retracted",
];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function validateBody(raw: unknown): { ok: true; body: CallBody } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "body is required" };
  }
  const b = raw as Record<string, unknown>;
  const {
    ticker,
    mint,
    thesis,
    entry_mcap,
    target_mcap,
    stop_mcap,
    timestamp_ms,
  } = b;

  // Sanity bounds: smallest viable call ($1 mcap bonding-curve meme),
  // largest plausible ($10B puts us comfortably above any 2026-era
  // Solana meme; anything above is a typo or out-of-scope target).
  const MIN_MCAP = 1;
  const MAX_MCAP = 10_000_000_000;

  if (typeof ticker !== "string" || !ticker.trim()) {
    return { ok: false, error: "ticker required" };
  }
  if (typeof mint !== "string" || !mint.trim()) {
    return { ok: false, error: "mint required" };
  }
  if (typeof thesis !== "string" || !thesis.trim()) {
    return { ok: false, error: "thesis required" };
  }
  if (thesis.length > 500) {
    return { ok: false, error: "thesis must be <= 500 chars" };
  }
  if (
    typeof entry_mcap !== "number" ||
    !Number.isFinite(entry_mcap) ||
    entry_mcap < MIN_MCAP ||
    entry_mcap > MAX_MCAP
  ) {
    return { ok: false, error: `entry_mcap must be between $${MIN_MCAP} and $${MAX_MCAP}` };
  }
  if (
    typeof target_mcap !== "number" ||
    !Number.isFinite(target_mcap) ||
    target_mcap < MIN_MCAP ||
    target_mcap > MAX_MCAP
  ) {
    return { ok: false, error: `target_mcap must be between $${MIN_MCAP} and $${MAX_MCAP}` };
  }
  if (
    stop_mcap !== null &&
    (typeof stop_mcap !== "number" ||
      !Number.isFinite(stop_mcap) ||
      stop_mcap < MIN_MCAP ||
      stop_mcap > MAX_MCAP)
  ) {
    return { ok: false, error: `stop_mcap must be between $${MIN_MCAP} and $${MAX_MCAP}, or null` };
  }
  if (typeof timestamp_ms !== "number" || !Number.isFinite(timestamp_ms) || timestamp_ms <= 0) {
    return { ok: false, error: "timestamp_ms must be a positive number" };
  }

  return {
    ok: true,
    body: {
      ticker,
      mint,
      thesis,
      entry_mcap,
      target_mcap,
      stop_mcap: stop_mcap as number | null,
      timestamp_ms,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const adminWallet = process.env.NEXT_PUBLIC_KC_CALL_WALLET;
    if (!adminWallet) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_KC_CALL_WALLET not configured" },
        { status: 500 }
      );
    }

    const payload = (await req.json()) as {
      body?: unknown;
      signature?: unknown;
      pubkey?: unknown;
    };
    const { signature, pubkey } = payload;

    if (typeof pubkey !== "string" || typeof signature !== "string") {
      return NextResponse.json({ error: "signature and pubkey required" }, { status: 400 });
    }
    if (pubkey !== adminWallet) {
      return NextResponse.json({ error: "unauthorized pubkey" }, { status: 403 });
    }

    const bodyCheck = validateBody(payload.body);
    if (!bodyCheck.ok) {
      return NextResponse.json({ error: bodyCheck.error }, { status: 400 });
    }

    if (!verifyCallSignature(bodyCheck.body, signature, pubkey)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    const client = await clientPromise;
    const now = new Date();
    const doc = {
      ...bodyCheck.body,
      signature,
      pubkey,
      status: "open" as CallStatus,
      status_history: [] as unknown[],
      created_at: now,
      updated_at: now,
    };
    const result = await client.db("unpluggedDB").collection("calls").insertOne(doc);
    return NextResponse.json({ id: result.insertedId.toHexString() }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const statusParam = req.nextUrl.searchParams.get("status");
    const limitParam = req.nextUrl.searchParams.get("limit");

    const filter: Record<string, unknown> = {};
    if (statusParam) {
      if (!VALID_STATUSES.includes(statusParam as CallStatus)) {
        return NextResponse.json({ error: "invalid status" }, { status: 400 });
      }
      filter.status = statusParam;
    }

    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        limit = Math.min(parsed, MAX_LIMIT);
      }
    }

    const client = await clientPromise;
    const docs = await client
      .db("unpluggedDB")
      .collection("calls")
      .find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    const calls = docs.map((d) => ({
      ...d,
      _id: (d._id as ObjectId).toHexString(),
    }));
    return NextResponse.json({ calls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
