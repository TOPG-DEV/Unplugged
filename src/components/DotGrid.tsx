"use client";

// Fixed-position dot-grid background, nextjs-style. Pure CSS radial
// gradient repeated — no JS, no DOM cost. Extremely faint so content
// reads clean on top.

export function DotGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        backgroundPosition: "0 0",
        WebkitMaskImage:
          "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.2) 90%)",
        maskImage:
          "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.2) 90%)",
      }}
    />
  );
}

export default DotGrid;
