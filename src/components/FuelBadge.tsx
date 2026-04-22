"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export function FuelBadge() {
  const { publicKey } = useWallet();
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onJoin = useCallback(async () => {
    if (!publicKey) {
      setStatus("err");
      setMessage("connect wallet first");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/fuel/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });
      const body = await res.json();
      if (!res.ok || !body.invite_link) {
        setStatus("err");
        setMessage(body.error === "not eligible" ? "allowlist only — DM the operator" : "invite failed");
        return;
      }
      window.open(body.invite_link, "_blank", "noopener,noreferrer");
      setStatus("ok");
      setMessage("opened in new tab");
    } catch {
      setStatus("err");
      setMessage("network error");
    }
  }, [publicKey]);

  return (
    <div className="inline-flex items-center gap-2 border border-emerald-900 bg-[#060e156e] rounded-full px-3 py-1 text-[10px] uppercase tracking-wider">
      <span className="text-emerald-400 animate-pulse" aria-hidden>
        ●
      </span>
      <span className="text-emerald-400">Fuel Prime Live</span>
      <span className="text-gray-500" aria-hidden>
        →
      </span>
      <button
        type="button"
        onClick={onJoin}
        disabled={status === "loading"}
        className="text-[#7fd0ff] hover:underline disabled:text-gray-500 disabled:no-underline"
        aria-label="Join the gated Telegram group"
      >
        {status === "loading" ? "…opening" : "Join the gated group"}
      </button>
      {message && (
        <span className={status === "err" ? "text-red-400" : "text-gray-500"}>· {message}</span>
      )}
    </div>
  );
}
