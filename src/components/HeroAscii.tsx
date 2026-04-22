"use client";

import { useEffect, useRef, useState } from "react";

// Ambient random-character background. Two layers:
//   1) Dim static grid of random chars (set once on mount)
//   2) Sparse "twinkle" layer that mutates a handful of cells every 180ms —
//      produces a matrix-vibe without the falling-rain motion.
// No cursor-follow. No radial mask. Just alive texture.
//
// Characters come from a mixed alphabet: binary digits, uppercase Latin,
// symbols, math glyphs. Zero box-drawing chars (those read as squiggly).

const CHARS = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*+=<>?!/\\∞≡∑Δ";
const COLS = 96;
const ROWS = 28;
const TWINKLE_EVERY_MS = 180;
const TWINKLE_COUNT = 18; // chars flipped per tick

function randChar(): string {
  return CHARS[(Math.random() * CHARS.length) | 0];
}

function buildStaticGrid(): string {
  // Density ~85% chars, 15% spaces — gives the texture breathing room.
  let out = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      out += Math.random() < 0.85 ? randChar() : " ";
    }
    out += "\n";
  }
  return out;
}

function buildTwinkleGrid(prev: string): string {
  // Start from previous twinkle grid, flip N random cells. Keep mostly spaces
  // so "bright" chars are sparse accents, not a second dense wall.
  const lines = prev.split("\n");
  for (let i = 0; i < TWINKLE_COUNT; i++) {
    const row = (Math.random() * ROWS) | 0;
    const col = (Math.random() * COLS) | 0;
    // 50/50 whether we plant a bright char or clear one
    const ch = Math.random() < 0.55 ? randChar() : " ";
    lines[row] = lines[row].substring(0, col) + ch + lines[row].substring(col + 1);
  }
  return lines.join("\n");
}

function buildEmptyTwinkle(): string {
  const row = " ".repeat(COLS);
  return Array(ROWS).fill(row).join("\n");
}

export function HeroAscii() {
  const staticGrid = useRef<string>(buildStaticGrid());
  const [twinkle, setTwinkle] = useState<string>(() => buildEmptyTwinkle());

  useEffect(() => {
    let alive = true;
    const id = setInterval(() => {
      if (!alive) return;
      setTwinkle((prev) => buildTwinkleGrid(prev));
    }, TWINKLE_EVERY_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {/* Dim static grid — fills the hero with ambient texture */}
      <pre
        className="absolute inset-0 m-0 text-[10px] leading-[11px] tracking-tight whitespace-pre text-white font-mono"
        style={{ opacity: 0.08 }}
      >
        {staticGrid.current}
      </pre>

      {/* Bright twinkle layer — sparse accent chars that mutate every 180ms */}
      <pre
        className="absolute inset-0 m-0 text-[10px] leading-[11px] tracking-tight whitespace-pre text-white font-mono"
        style={{ opacity: 0.55 }}
      >
        {twinkle}
      </pre>

      {/* Edge vignette so the grid bleeds into black rather than hard-cutting */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.85) 100%), linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 85%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </div>
  );
}

export default HeroAscii;
