"use client";

import { useEffect, useRef, useState } from "react";

// Full-viewport ambient random-character backdrop. Fixed position, z-0,
// pointer-events-none, sits behind all content. Two layers:
//   1. Dim static grid (opacity 0.06) — set once
//   2. Twinkle grid (opacity 0.22) — flips a handful of cells every 220ms
// No cursor tracking, no falling rain. Just alive texture behind the page.

const CHARS = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*+=<>?!/\\∞≡∑Δ";
const COLS = 140;
const ROWS = 60;
const TWINKLE_EVERY_MS = 220;
const TWINKLE_COUNT = 22;

function randChar(): string {
  return CHARS[(Math.random() * CHARS.length) | 0];
}

function buildStaticGrid(): string {
  let out = "";
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      out += Math.random() < 0.8 ? randChar() : " ";
    }
    out += "\n";
  }
  return out;
}

function buildEmptyTwinkle(): string {
  const row = " ".repeat(COLS);
  return Array(ROWS).fill(row).join("\n");
}

function mutateTwinkle(prev: string): string {
  const lines = prev.split("\n");
  for (let i = 0; i < TWINKLE_COUNT; i++) {
    const row = (Math.random() * ROWS) | 0;
    const col = (Math.random() * COLS) | 0;
    const ch = Math.random() < 0.55 ? randChar() : " ";
    lines[row] = lines[row].substring(0, col) + ch + lines[row].substring(col + 1);
  }
  return lines.join("\n");
}

export function PageAscii() {
  const staticGrid = useRef<string>(buildStaticGrid());
  const [twinkle, setTwinkle] = useState<string>(() => buildEmptyTwinkle());

  useEffect(() => {
    let alive = true;
    const id = setInterval(() => {
      if (!alive) return;
      setTwinkle((prev) => mutateTwinkle(prev));
    }, TWINKLE_EVERY_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
    >
      {/* Dim static grid */}
      <pre
        className="absolute inset-0 m-0 text-[10px] md:text-[11px] leading-[11px] md:leading-[12px] tracking-tight whitespace-pre text-white font-mono"
        style={{ opacity: 0.06 }}
      >
        {staticGrid.current}
      </pre>

      {/* Twinkle grid — sparse mutating chars */}
      <pre
        className="absolute inset-0 m-0 text-[10px] md:text-[11px] leading-[11px] md:leading-[12px] tracking-tight whitespace-pre text-white font-mono"
        style={{ opacity: 0.22 }}
      >
        {twinkle}
      </pre>

      {/* Soft top + bottom edge fades — keeps header + footer crisp */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 15%, rgba(0,0,0,0) 85%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </div>
  );
}

export default PageAscii;
