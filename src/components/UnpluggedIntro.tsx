"use client";

import { useEffect, useState } from "react";

// Full-screen cinematic intro: UNPLUGGED fades in with blur, holds, flickers,
// fades out to reveal the landing. Plays once per browser session via
// sessionStorage so reloading mid-session doesn't re-trigger.

const STORAGE_KEY = "unplugged_intro_played_v1";
const DURATION_MS = 3800;

const ASCII_GRID = `
┌─·─┐·┌─·─┐·┌─·─┐·┌─·─┐·┌─·─┐·┌─·─┐·┌─·─┐·┌─·─┐
│···│·│···│·│···│·│···│·│···│·│···│·│···│·│···│
└─·─┘·└─·─┘·└─·─┘·└─·─┘·└─·─┘·└─·─┘·└─·─┘·└─·─┘
·····································································
┌─·─┐·┌─·─┐·┌─·─┐·┌─·─┐·┌─·─┐·┌─·─┐·┌─·─┐·┌─·─┐
│···│·│···│·│···│·│···│·│···│·│···│·│···│·│···│
└─·─┘·└─·─┘·└─·─┘·└─·─┘·└─·─┘·└─·─┘·└─·─┘·└─·─┘
`.trim();

export function UnpluggedIntro() {
  const [mounted, setMounted] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // SSR-safe: only run after mount
    try {
      if (typeof window === "undefined") return;
      if (window.sessionStorage.getItem(STORAGE_KEY)) {
        setGone(true);
        return;
      }
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // private browsing → just play the intro once per full page load
    }
    setMounted(true);
    const t = setTimeout(() => setGone(true), DURATION_MS + 100);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;
  if (!mounted) {
    // Render a plain black shell on SSR so there's no flash of landing
    return <div className="fixed inset-0 z-[60] bg-black pointer-events-none" aria-hidden />;
  }

  return (
    <div
      aria-hidden
      className="intro-backdrop fixed inset-0 z-[60] bg-black flex items-center justify-center pointer-events-none overflow-hidden"
    >
      {/* Subtle ASCII grid behind the wordmark */}
      <pre
        className="intro-grid absolute inset-0 flex items-center justify-center text-[10px] leading-[10px] text-[#7fd0ff]/70 font-mono tracking-tight whitespace-pre pointer-events-none"
        style={{
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 70%)",
        }}
      >
        {ASCII_GRID}
      </pre>

      <h1
        className="intro-wordmark font-sans font-black text-white text-[14vw] md:text-[12vw] leading-none select-none"
        style={{
          textShadow: "0 0 48px rgba(127, 208, 255, 0.08)",
        }}
      >
        UNPLUGGED
      </h1>
    </div>
  );
}

export default UnpluggedIntro;
