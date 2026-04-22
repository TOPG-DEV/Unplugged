"use client";

import CustomWalletButton from "@/components/ui/CustomWalletButton";
import Wire from "@/components/Wire";
import Tracker from "@/components/Tracker";
import Trending from "@/components/Trending";
import { FuelBadge } from "@/components/FuelBadge";
import { TickerTape } from "@/components/TickerTape";
import { AdminNav } from "@/components/AdminNav";
import { UnpluggedIntro } from "@/components/UnpluggedIntro";
import { DotGrid } from "@/components/DotGrid";

// Tiny section-label primitive. nextjs.org pattern — small uppercase
// label with a leading 2-digit index sets up each surface.
function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div
      className="mb-4 flex items-center gap-3 text-[10px] md:text-[11px] uppercase text-white/50"
      style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 600, letterSpacing: "0.28em" }}
    >
      <span className="font-mono text-white/30">{index}</span>
      <span className="h-px w-8 bg-white/15" />
      <span>{children}</span>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <UnpluggedIntro />
      <DotGrid />
      <TickerTape />
      <AdminNav />
      <main className="relative z-10 min-h-screen text-white flex flex-col items-center justify-start px-4 sm:px-6 pt-16 md:pt-24 pb-20">
        <div className="w-full max-w-5xl">
          {/* =========================== HERO =========================== */}
          <section
            className="relative mb-20 md:mb-28 fade-in"
            style={{ animationDelay: "120ms" }}
          >
            <div
              className="mb-6 flex items-center gap-3 text-[10px] md:text-[11px] uppercase text-white/50"
              style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 600, letterSpacing: "0.3em" }}
            >
              <span className="font-mono text-white/30">00</span>
              <span className="h-px w-8 bg-white/15" />
              <span>a protocol, not a product</span>
            </div>

            <h1
              className="text-white leading-[0.85] select-none whitespace-nowrap"
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontWeight: 900,
                fontSize: "clamp(2.5rem, 13vw, 10rem)",
                letterSpacing: "-0.045em",
              }}
            >
              UNPLUGGED
            </h1>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <FuelBadge />
            </div>

            <p
              className="mt-12 md:mt-16 text-2xl sm:text-3xl md:text-4xl leading-[1.05] text-white max-w-2xl"
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.025em",
              }}
            >
              Step out of the circle.
            </p>
            <p
              className="mt-4 text-sm md:text-base leading-relaxed text-white/60 max-w-xl"
              style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 400 }}
            >
              Mainstream noise is engineered to keep you reacting. Unplugged is the terminal for the ones already out — signed calls, smart-wallet flow, one-click execution. Careless. Emotionless. Still playing.
            </p>
          </section>

          {/* ====================== CONNECT ============================= */}
          <section className="mb-20 md:mb-24 fade-in" style={{ animationDelay: "220ms" }}>
            <SectionLabel index="01">connect</SectionLabel>
            <CustomWalletButton />
          </section>

          {/* ====================== WIRE + TRACKER ====================== */}
          <section className="mb-20 md:mb-24 fade-in" style={{ animationDelay: "320ms" }}>
            <SectionLabel index="02">the wire &amp; the tracker</SectionLabel>
            <div className="grid gap-4 md:grid-cols-2">
              <Wire />
              <Tracker />
            </div>
          </section>

          {/* ====================== TRENDING ============================ */}
          <section className="mb-24 md:mb-32 fade-in" style={{ animationDelay: "420ms" }}>
            <SectionLabel index="03">trending now</SectionLabel>
            <Trending />
          </section>

          {/* ====================== FOOTER ============================== */}
          <footer className="mt-20 md:mt-32 pt-8 border-t border-white/10 text-xs text-white/40 space-y-3">
            <p
              className="uppercase text-[10px] text-white/60"
              style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 600, letterSpacing: "0.35em" }}
            >
              unplugged // protocol
            </p>
            <p className="max-w-2xl">
              For community engagement and experimentation. Not financial advice.
              Participation is voluntary and no profit is promised or implied.
            </p>
            <p className="max-w-2xl">
              Non-custodial tooling. Your wallet signs every trade. By connecting a
              wallet you acknowledge and accept these terms.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
