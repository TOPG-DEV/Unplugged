"use client";

import { useEffect, useRef } from "react";

// Cursor-follow ASCII background. Renders a fixed grid of characters,
// dims everything globally, and lifts opacity in a circle around the
// mouse via a CSS radial-gradient mask driven by --mx / --my vars.
//
// No per-frame React re-renders — one pointer event updates two CSS
// custom props and the browser handles the rest.

const GLYPHS = "│┤┐└┴┬├─┼┘┌╔╗╚╝║═╠╣╦╩╬·∙·∙·∙";
const GRID_COLS = 60;
const GRID_ROWS = 22;

function buildPattern(): string {
  let out = "";
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const glyph = GLYPHS[(r * 7 + c * 13) % GLYPHS.length];
      out += glyph;
    }
    out += "\n";
  }
  return out;
}

export function HeroAscii() {
  const ref = useRef<HTMLDivElement | null>(null);
  const pattern = useRef<string>(buildPattern());

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--mx", `${x}%`);
      el.style.setProperty("--my", `${y}%`);
    };
    const onLeave = () => {
      el.style.setProperty("--mx", `50%`);
      el.style.setProperty("--my", `50%`);
    };
    window.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
      style={{
        ["--mx" as string]: "50%",
        ["--my" as string]: "50%",
      }}
    >
      <pre
        className="absolute inset-0 text-[10px] leading-[10px] tracking-tight whitespace-pre text-[#7fd0ff] font-mono"
        style={{
          opacity: 0.35,
          WebkitMaskImage:
            "radial-gradient(circle 220px at var(--mx) var(--my), rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 100%)",
          maskImage:
            "radial-gradient(circle 220px at var(--mx) var(--my), rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0) 100%)",
          transition: "opacity 300ms ease",
        }}
      >
        {pattern.current}
      </pre>
      {/* Black vignette to keep edges soft */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.9) 100%)",
        }}
      />
    </div>
  );
}

export default HeroAscii;
