"use client";

import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { AdminGate } from "@/components/ui/AdminGate";
import { canonicalJSON } from "@/lib/sig";
import type { CallBody } from "@/lib/types/call";

interface PostedCall {
  id: string;
  ticker: string;
}

function NewCallForm() {
  const { publicKey, signMessage } = useWallet();
  const [ticker, setTicker] = useState("");
  const [mint, setMint] = useState("");
  const [thesis, setThesis] = useState("");
  const [entryMcap, setEntryMcap] = useState("");
  const [targetMcap, setTargetMcap] = useState("");
  const [stopMcap, setStopMcap] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<PostedCall | null>(null);

  const signMessageAvailable = typeof signMessage === "function";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!publicKey) {
      setError("Wallet not connected.");
      return;
    }
    if (!signMessageAvailable || !signMessage) {
      setError(
        "This wallet doesn't support message signing. Use Phantom or Solflare."
      );
      return;
    }

    const entryNum = parseFloat(entryMcap);
    const targetNum = parseFloat(targetMcap);
    const stopNum = stopMcap.trim() === "" ? null : parseFloat(stopMcap);

    if (!ticker.trim() || !mint.trim() || !thesis.trim()) {
      setError("Ticker, mint, and thesis are required.");
      return;
    }
    if (!Number.isFinite(entryNum) || entryNum <= 0) {
      setError("Entry mcap must be a positive USD value (e.g. 135000 for $135K).");
      return;
    }
    if (!Number.isFinite(targetNum) || targetNum <= 0) {
      setError("Target mcap must be a positive USD value.");
      return;
    }
    if (stopNum !== null && (!Number.isFinite(stopNum) || stopNum <= 0)) {
      setError("Stop mcap must be a positive USD value if provided.");
      return;
    }
    if (thesis.length > 500) {
      setError("Thesis must be 500 chars or fewer.");
      return;
    }

    const body: CallBody = {
      ticker: ticker.trim().toUpperCase(),
      mint: mint.trim(),
      thesis: thesis.trim(),
      entry_mcap: entryNum,
      target_mcap: targetNum,
      stop_mcap: stopNum,
      timestamp_ms: Date.now(),
    };

    try {
      setSubmitting(true);
      const message = new TextEncoder().encode(canonicalJSON(body));
      const signatureBytes = await signMessage(message);
      const signature = bs58.encode(signatureBytes);
      const pubkey = publicKey.toBase58();

      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, signature, pubkey }),
      });

      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        throw new Error(data.error ?? `Server returned ${res.status}`);
      }

      setPosted({ id: data.id, ticker: body.ticker });
      setTicker("");
      setMint("");
      setThesis("");
      setEntryMcap("");
      setTargetMcap("");
      setStopMcap("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post call.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!signMessageAvailable) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">
          This wallet doesn&apos;t support message signing. Use Phantom or Solflare.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Post a Call</h1>
        <p className="mt-2 text-sm uppercase tracking-[0.3em] text-[#7fd0ff]">
          KC Call wallet · ed25519 signed
        </p>
      </header>

      {posted ? (
        <div className="border border-[#1e4465] bg-[#060e156e] rounded-xl p-6 mb-6">
          <p className="text-[#7bff91]">
            Call posted: <strong>{posted.ticker}</strong>
          </p>
          <p className="text-gray-400 text-xs mt-2">id {posted.id}</p>
          <Link
            href="/"
            className="inline-block mt-4 text-[#7fd0ff] underline text-sm"
          >
            View on The Wire →
          </Link>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col text-sm">
          <span className="uppercase tracking-wider text-gray-400 mb-1">Ticker</span>
          <input
            className="bg-[#060e156e] border border-[#1e4465] rounded px-3 py-2 font-mono"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="WIF"
            maxLength={20}
            required
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="uppercase tracking-wider text-gray-400 mb-1">Mint</span>
          <input
            className="bg-[#060e156e] border border-[#1e4465] rounded px-3 py-2 font-mono"
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            placeholder="SPL mint pubkey"
            required
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="uppercase tracking-wider text-gray-400 mb-1">Thesis</span>
          <textarea
            className="bg-[#060e156e] border border-[#1e4465] rounded px-3 py-2"
            rows={4}
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder="Why this, why now. Max 500 chars."
            maxLength={500}
            required
          />
          <span className="text-xs text-gray-500 mt-1">{thesis.length}/500</span>
        </label>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex flex-col text-sm">
            <span className="uppercase tracking-wider text-gray-400 mb-1">Entry MCAP</span>
            <input
              className="bg-[#060e156e] border border-[#1e4465] rounded px-3 py-2 font-mono"
              type="number"
              step="any"
              min="0"
              value={entryMcap}
              onChange={(e) => setEntryMcap(e.target.value)}
              placeholder="135000"
              required
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="uppercase tracking-wider text-gray-400 mb-1">Target MCAP</span>
            <input
              className="bg-[#060e156e] border border-[#1e4465] rounded px-3 py-2 font-mono"
              type="number"
              step="any"
              min="0"
              value={targetMcap}
              onChange={(e) => setTargetMcap(e.target.value)}
              placeholder="500000"
              required
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="uppercase tracking-wider text-gray-400 mb-1">Stop MCAP</span>
            <input
              className="bg-[#060e156e] border border-[#1e4465] rounded px-3 py-2 font-mono"
              type="number"
              step="any"
              min="0"
              value={stopMcap}
              onChange={(e) => setStopMcap(e.target.value)}
              placeholder="optional"
            />
          </label>
        </div>
        <p className="text-xs text-gray-500 -mt-1">
          Enter USD market cap. For a $135K mcap call, type{" "}
          <code className="text-gray-400">135000</code>. Range: $1 – $10B.
        </p>

        {error ? <p className="text-red-400 text-sm">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 border border-yellow-400 text-yellow-400 rounded px-4 py-2 uppercase tracking-wider hover:bg-yellow-700 transition disabled:opacity-50"
        >
          {submitting ? "Signing…" : "Sign & Post"}
        </button>
      </form>
    </div>
  );
}

export default function NewCallPage() {
  return (
    <main className="min-h-screen bg-black text-white font-mono py-12">
      <AdminGate>
        <NewCallForm />
      </AdminGate>
    </main>
  );
}
