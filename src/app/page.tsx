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
import { Decoder } from "@/components/Decoder";

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <div
      className="mb-5 flex items-center gap-3 text-[10px] md:text-[11px] uppercase text-white/50"
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
            className="relative mb-16 md:mb-20 fade-in"
            style={{ animationDelay: "120ms" }}
          >
            <div
              className="mb-6 flex items-center gap-3 text-[10px] md:text-[11px] uppercase text-white/50"
              style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 600, letterSpacing: "0.3em" }}
            >
              <span className="font-mono text-white/30">00</span>
              <span className="h-px w-8 bg-white/15" />
              <span>an AI that reads past the noise</span>
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

            <p
              className="mt-10 md:mt-14 text-2xl sm:text-3xl md:text-4xl leading-[1.03] text-white max-w-3xl"
              style={{
                fontFamily: "'Archivo', sans-serif",
                fontWeight: 700,
                letterSpacing: "-0.025em",
              }}
            >
              The mainstream wants you reacting. Unplugged tells you what&apos;s real.
            </p>
            <p
              className="mt-4 text-sm md:text-base leading-relaxed text-white/60 max-w-2xl"
              style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 400 }}
            >
              Paste any mint. We pull on-chain safety, smart-money flow, holder cohort, and narrative heat — then AI returns a verdict with evidence. Not another caller. Not another tracker. A filter.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <FuelBadge />
            </div>
          </section>

          {/* ====================== DECODER (hero feature) ============== */}
          <section className="mb-20 md:mb-28 fade-in" style={{ animationDelay: "220ms" }}>
            <SectionLabel index="01">decode any token</SectionLabel>
            <Decoder />
          </section>

          {/* ====================== CONNECT ============================= */}
          <section className="mb-20 md:mb-24 fade-in" style={{ animationDelay: "320ms" }}>
            <SectionLabel index="02">connect</SectionLabel>
            <p
              className="text-sm md:text-base text-white/60 max-w-xl mb-5"
              style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 400 }}
            >
              Non-custodial. Your wallet signs every trade. We never see your keys.
            </p>
            <CustomWalletButton />
          </section>

          {/* ====================== SIGNAL + FLOW ======================= */}
          <section className="mb-20 md:mb-24 fade-in" style={{ animationDelay: "420ms" }}>
            <SectionLabel index="03">signal &amp; flow</SectionLabel>
            <p
              className="text-sm md:text-base text-white/60 max-w-2xl mb-6"
              style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 400 }}
            >
              What KC is signing on-chain. What smart wallets are actually doing. No tweets, no shills, no affiliate links — just the tape.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Wire />
              <Tracker />
            </div>
          </section>

          {/* ====================== TRENDING ============================ */}
          <section className="mb-24 md:mb-32 fade-in" style={{ animationDelay: "520ms" }}>
            <SectionLabel index="04">trending — filtered</SectionLabel>
            <p
              className="text-sm md:text-base text-white/60 max-w-2xl mb-6"
              style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 400 }}
            >
              Scored on volume acceleration + unique buyers + smart-money alignment. Not whatever Twitter is pumping today.
            </p>
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
              Experimental. Not financial advice. Decoder verdicts are AI-synthesized from public on-chain data and can be wrong. Confirm before you size.
            </p>
            <p className="max-w-2xl">
              Non-custodial tooling. Your wallet signs every trade. By connecting a wallet you acknowledge and accept these terms.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
