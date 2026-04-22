"use client";

// 4-light scanner readout. Fetches /api/scan/:mint on mount, renders:
//   - 4 traffic lights (LP locked, mint renounced, top-10 holders, honeypot clear)
//   - a detail row (LP / Vol24h / Top10 / Age)
// Graceful degradation: if rugcheck failed, show question-mark lights for
// rugcheck-derived signals but keep the DexScreener detail row.

import { useEffect, useState } from "react";
import type { Light, ScanResult } from "@/lib/types/scanner";

interface Props {
  mint: string;
}

const LIGHT_CLASS: Record<Light, string> = {
  green: "text-green-400",
  yellow: "text-yellow-400",
  red: "text-red-500",
  unknown: "text-gray-500",
};

function LightDot({ light, label }: { light: Light; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`${LIGHT_CLASS[light]} text-base leading-none`}>●</span>
      <span className="text-gray-300">{label}</span>
    </span>
  );
}

function formatUsd(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toFixed(0)}`;
}

function formatAge(ms: number | null): string {
  if (ms == null || ms <= 0) return "—";
  const d = Math.floor(ms / 86_400_000);
  if (d < 1) return "<1d";
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(mo / 12)}y`;
}

function formatPct(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

function topHolderLight(pct: number | null): Light {
  if (pct == null) return "unknown";
  if (pct < 40) return "green";
  if (pct < 60) return "yellow";
  return "red";
}

function mintRenouncedLight(renounced: boolean | null): Light {
  if (renounced == null) return "unknown";
  return renounced ? "green" : "red";
}

function honeypotLight(flag: boolean | null): Light {
  if (flag == null) return "unknown";
  return flag ? "red" : "green";
}

export function Scanner({ mint }: Props) {
  const [data, setData] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/scan/${mint}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`scan ${r.status}`);
        return (await r.json()) as ScanResult;
      })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "scan error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mint]);

  if (loading) {
    return (
      <div className="mt-2 space-y-1.5 border-l-2 border-gray-700 pl-3 text-xs text-gray-500">
        <div className="h-4 w-56 animate-pulse rounded bg-gray-800" />
        <div className="h-3 w-72 animate-pulse rounded bg-gray-800" />
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="mt-2 border-l-2 border-red-900 pl-3 text-xs text-red-400">
        Scanner unavailable for this mint.
      </div>
    );
  }

  const bothFailed =
    data.sources.dexscreener === "error" && data.sources.rugcheck === "error";
  if (bothFailed) {
    return (
      <div className="mt-2 border-l-2 border-red-900 pl-3 text-xs text-red-400">
        Scanner unavailable for this mint.
      </div>
    );
  }

  const rug = data.rugcheck;
  const dex = data.dexscreener;

  const lpLight: Light = rug ? rug.lpLocked : "unknown";
  const mintLight: Light = mintRenouncedLight(rug ? rug.mintRenounced : null);
  const top10Light: Light = topHolderLight(rug ? rug.top10HolderPct : null);
  const honeypotL: Light = honeypotLight(rug ? rug.honeypotFlag : null);

  return (
    <div className="mt-2 space-y-1.5 border-l-2 border-gray-700 pl-3">
      <div className="flex flex-wrap items-center gap-3">
        <LightDot light={lpLight} label="LP locked" />
        <LightDot light={mintLight} label="Mint renounced" />
        <LightDot light={top10Light} label="Top-10 &lt; 40%" />
        <LightDot light={honeypotL} label="Honeypot clear" />
      </div>
      <div className="text-xs text-gray-500">
        LP: {formatUsd(dex?.liquidityUsd ?? null)} · Vol24h:{" "}
        {formatUsd(dex?.volume24hUsd ?? null)} · Top10:{" "}
        {formatPct(rug?.top10HolderPct ?? null)} · Age:{" "}
        {formatAge(dex?.pairAgeMs ?? null)}
        {data.sources.rugcheck === "error" && (
          <span className="ml-2 text-yellow-500">(rugcheck unavailable)</span>
        )}
        {data.sources.dexscreener === "error" && (
          <span className="ml-2 text-yellow-500">(dexscreener unavailable)</span>
        )}
      </div>
    </div>
  );
}
