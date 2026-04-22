import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongo";
import { verifyStatusSignature } from "@/lib/sig";
import type { CallStatus, StatusChange } from "@/lib/types/call";

const VALID_STATUSES: CallStatus[] = [
  "open",
  "closed-win",
  "closed-loss",
  "stopped-out",
  "closed-retracted",
];

const CLOSING_STATUSES: CallStatus[] = [
  "closed-win",
  "closed-loss",
  "stopped-out",
];

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminWallet = process.env.NEXT_PUBLIC_KC_CALL_WALLET;
    if (!adminWallet) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_KC_CALL_WALLET not configured" },
        { status: 500 }
      );
    }

    const { id } = await context.params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    const payload = (await req.json()) as {
      status?: unknown;
      timestamp_ms?: unknown;
      signature?: unknown;
      pubkey?: unknown;
      close_price?: unknown;
    };
    const { status, timestamp_ms, signature, pubkey, close_price } = payload;

    if (typeof pubkey !== "string" || typeof signature !== "string") {
      return NextResponse.json(
        { error: "signature and pubkey required" },
        { status: 400 }
      );
    }
    if (pubkey !== adminWallet) {
      return NextResponse.json({ error: "unauthorized pubkey" }, { status: 403 });
    }
    if (typeof status !== "string" || !VALID_STATUSES.includes(status as CallStatus)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    if (
      typeof timestamp_ms !== "number" ||
      !Number.isFinite(timestamp_ms) ||
      timestamp_ms <= 0
    ) {
      return NextResponse.json(
        { error: "timestamp_ms must be a positive number" },
        { status: 400 }
      );
    }

    if (!verifyStatusSignature(id, status, timestamp_ms, signature, pubkey)) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    const client = await clientPromise;
    const calls = client.db("unpluggedDB").collection("calls");
    const existing = await calls.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: "call not found" }, { status: 404 });
    }

    const newStatus = status as CallStatus;
    const closingTransition =
      existing.status === "open" && CLOSING_STATUSES.includes(newStatus);

    let closePrice: number | undefined;
    if (closingTransition) {
      if (
        typeof close_price !== "number" ||
        !Number.isFinite(close_price) ||
        close_price <= 0
      ) {
        return NextResponse.json(
          { error: "close_price > 0 required when closing an open call" },
          { status: 400 }
        );
      }
      closePrice = close_price;
    } else if (typeof close_price === "number") {
      // accept an optional close_price on other transitions too, if provided
      if (Number.isFinite(close_price) && close_price > 0) {
        closePrice = close_price;
      }
    }

    const change: StatusChange = {
      status: newStatus,
      timestamp_ms,
      signature,
      ...(closePrice !== undefined ? { close_price: closePrice } : {}),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: any = {
      $set: { status: newStatus, updated_at: new Date() },
      $push: { status_history: change },
    };

    const updated = await calls.findOneAndUpdate(
      { _id: new ObjectId(id) },
      update,
      { returnDocument: "after" }
    );

    if (!updated) {
      return NextResponse.json({ error: "call not found" }, { status: 404 });
    }

    return NextResponse.json({
      call: {
        ...updated,
        _id: (updated._id as ObjectId).toHexString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
