"use client";

import { useEffect, useMemo, useState } from "react";

// Full-screen cinematic intro: UNPLUGGED in Archivo Black fades in with
// blur + wide tracking, snaps into place, executes three hard flickers,
// holds, and fades out. Black & white only. A moving horizontal scanline
// + SVG noise grain add film-grain atmosphere.
// Plays once per browser session via sessionStorage.

const STORAGE_KEY = "unplugged_intro_played_v2";
const DURATION_MS = 4200;

// Inline SVG noise — turbulence-based grain. Cheap, no external asset.
const NOISE_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.35 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`;

export function UnpluggedIntro() {
  const [mounted, setMounted] = useState(false);
  const [gone, setGone] = useState(false);

  // Random character strip shown above + below wordmark for texture.
  const aboveLine = useMemo(() => makeMarqueeLine("· SIGNAL · NOISE · TUNE OUT · UNPLUGGED · OPERATOR · "), []);
  const belowLine = useMemo(() => makeMarqueeLine("· STEP OUT OF THE CIRCLE · NO SOCKPUPPETS · "), []);

  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      if (window.sessionStorage.getItem(STORAGE_KEY)) {
        setGone(true);
        return;
      }
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // private-browsing — just play once per full page load
    }
    setMounted(true);
    const t = setTimeout(() => setGone(true), DURATION_MS + 200);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;
  if (!mounted) {
    // SSR shell — solid black so there's no flash of landing before JS boots
    return <div className="fixed inset-0 z-[60] bg-black pointer-events-none" aria-hidden />;
  }

  return (
    <div
      aria-hidden
      className="intro-backdrop fixed inset-0 z-[60] bg-black pointer-events-none overflow-hidden flex items-center justify-center"
    >
      {/* Grain layer */}
      <div
        className="intro-noise absolute inset-0 mix-blend-overlay"
        style={{
          backgroundImage: `url("${NOISE_SVG}")`,
          backgroundSize: "160px 160px",
        }}
      />

      {/* Horizontal scanline sweep (top → bottom once) */}
      <div
        className="intro-scanline absolute left-0 right-0 h-[2px] bg-white/30"
        style={{
          boxShadow: "0 0 12px rgba(255,255,255,0.4)",
        }}
      />

      {/* Wordmark + flanking text strips */}
      <div className="relative flex flex-col items-center w-full px-4">
        <div className="intro-wordmark w-full flex flex-col items-center">
          {/* Strip above — small, wide-tracked */}
          <div className="w-full overflow-hidden mb-3 md:mb-4">
            <div className="whitespace-nowrap text-[9px] md:text-[11px] uppercase tracking-[0.4em] text-white/40 font-mono text-center">
              {aboveLine}
            </div>
          </div>

          {/* THE wordmark — Archivo Black, giant */}
          <h1
            className="font-sans text-white leading-[0.82] text-center select-none"
            style={{
              fontFamily: "'Archivo', sans-serif",
              fontWeight: 900,
              fontSize: "clamp(4rem, 17vw, 15rem)",
              letterSpacing: "-0.045em",
            }}
          >
            UNPLUGGED
          </h1>

          {/* Strip below */}
          <div className="w-full overflow-hidden mt-3 md:mt-4">
            <div className="whitespace-nowrap text-[9px] md:text-[11px] uppercase tracking-[0.4em] text-white/40 font-mono text-center">
              {belowLine}
            </div>
          </div>

          {/* Static subline — appears synchronized with wordmark */}
          <div className="mt-6 md:mt-8 text-[10px] md:text-xs uppercase tracking-[0.5em] text-white/50 font-sans">
            a protocol, not a product
          </div>
        </div>
      </div>
    </div>
  );
}

function makeMarqueeLine(seed: string): string {
  // Repeat seed text enough times to fill a wide viewport
  return seed.repeat(12).trim();
}

export default UnpluggedIntro;
