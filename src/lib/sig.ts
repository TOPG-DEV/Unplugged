import nacl from "tweetnacl";
import bs58 from "bs58";
import { CallBody, CALL_FIELDS } from "@/lib/types/call";

/**
 * Deterministic stringify of a CallBody using alphabetical key order.
 * Phase 2 call bodies are flat; no nested objects.
 *
 * Both signer (client) and verifier (server) walk CALL_FIELDS in the
 * same order so signatures round-trip across JS engines.
 */
export function canonicalJSON(body: CallBody): string {
  const out: Record<string, unknown> = {};
  for (const k of CALL_FIELDS) {
    out[k] = body[k];
  }
  return JSON.stringify(out);
}

/**
 * Verify an ed25519 signature against a CallBody and its claimed signer pubkey.
 * Returns false on any decode / length / verify failure — never throws.
 */
export function verifyCallSignature(
  body: CallBody,
  sigBase58: string,
  pubkeyBase58: string
): boolean {
  try {
    const message = new TextEncoder().encode(canonicalJSON(body));
    const signature = bs58.decode(sigBase58);
    const pubkey = bs58.decode(pubkeyBase58);
    if (signature.length !== 64 || pubkey.length !== 32) return false;
    return nacl.sign.detached.verify(message, signature, pubkey);
  } catch {
    return false;
  }
}

/**
 * Verify a status-change signature. Payload is canonical JSON of
 * { call_id, status, timestamp_ms } — object literal in that key order
 * (alphabetical already: call_id < status < timestamp_ms).
 */
export function verifyStatusSignature(
  call_id: string,
  status: string,
  timestamp_ms: number,
  sigBase58: string,
  pubkeyBase58: string
): boolean {
  try {
    const payload = JSON.stringify({ call_id, status, timestamp_ms });
    const message = new TextEncoder().encode(payload);
    const signature = bs58.decode(sigBase58);
    const pubkey = bs58.decode(pubkeyBase58);
    if (signature.length !== 64 || pubkey.length !== 32) return false;
    return nacl.sign.detached.verify(message, signature, pubkey);
  } catch {
    return false;
  }
}
