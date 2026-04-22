"use client";

import { useEffect, useRef } from "react";

// Cursor-follow ASCII background. Two stacked grids:
//   - ambient layer: always visible, low opacity
//   - highlight layer: radial mask at pointer position, higher opacity
// One pointermove event updates --mx / --my CSS custom props; the browser
// handles the rest. No per-frame React re-renders.

const GLYPHS = "│┤┐└┴┬├─┼┘┌╔╗╚╝║═╠╣╦╩╬·∙·▓▒░·∙";
const GRID_COLS = 72;
const GRID_ROWS = 26;

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
      {/* Ambient layer — always visible at low opacity */}
      <pre
        className="absolute inset-0 text-[11px] leading-[11px] tracking-tight whitespace-pre text-[#7fd0ff]/35 font-mono"
        style={{ opacity: 0.18 }}
      >
        {pattern.current}
      </pre>

      {/* Highlight layer — radial mask follows the cursor */}
      <pre
        className="absolute inset-0 text-[11px] leading-[11px] tracking-tight whitespace-pre text-[#7fd0ff] font-mono"
        style={{
          opacity: 0.7,
          WebkitMaskImage:
            "radial-gradient(circle 280px at var(--mx) var(--my), rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0) 90%)",
          maskImage:
            "radial-gradient(circle 280px at var(--mx) var(--my), rgba(0,0,0,1) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0) 90%)",
          transition: "opacity 300ms ease",
        }}
      >
        {pattern.current}
      </pre>

      {/* Soft vignette so edges fade, not slam, into black */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.7) 90%)",
        }}
      />
    </div>
  );
}

export default HeroAscii;
