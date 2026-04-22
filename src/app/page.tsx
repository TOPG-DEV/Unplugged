"use client";

import CustomWalletButton from "@/components/ui/CustomWalletButton";
import Wire from "@/components/Wire";
import Tracker from "@/components/Tracker";
import Trending from "@/components/Trending";
import { FuelBadge } from "@/components/FuelBadge";
import { TickerTape } from "@/components/TickerTape";
import { HeroAscii } from "@/components/HeroAscii";
import { AdminNav } from "@/components/AdminNav";
import { UnpluggedIntro } from "@/components/UnpluggedIntro";

export default function Home() {
  return (
    <>
      <UnpluggedIntro />
      <TickerTape />
      <AdminNav />
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-start px-6 pt-10 pb-20">
        <div className="w-full max-w-4xl">
          {/* Hero with cursor-follow ASCII background */}
          <section className="relative rounded-2xl overflow-hidden mb-10 fade-in" style={{ animationDelay: "120ms" }}>
            <HeroAscii />
            <header className="relative z-10 px-2 md:px-6 pt-10 pb-8">
              <h1
                className="font-black tracking-tight leading-[0.88] text-white select-none"
                style={{ fontSize: "clamp(4.5rem, 16vw, 12rem)", letterSpacing: "-0.02em" }}
              >
                UNPLUGGED
              </h1>
              <p className="mt-3 text-[10px] md:text-xs uppercase tracking-[0.45em] text-[#7fd0ff] font-medium">
                the protocol for degens leaving the mainstream
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <FuelBadge />
              </div>
              <p className="mt-8 text-xl md:text-2xl leading-[1.15] text-white max-w-2xl font-semibold">
                Step out of the circle.
              </p>
              <p className="mt-3 text-sm md:text-base leading-relaxed text-gray-400 max-w-xl">
                The mainstream is noise engineered to keep you reacting. Unplugged is the terminal for operators who already left — signed calls, smart-wallet flow, one-click execution. Careless. Emotionless. Still playing the game.
              </p>
            </header>
          </section>

          <section className="mb-10 fade-in" style={{ animationDelay: "220ms" }}>
            <CustomWalletButton />
          </section>

          <section className="grid gap-4 md:grid-cols-2 mb-10 fade-in" style={{ animationDelay: "320ms" }}>
            <Wire />
            <Tracker />
          </section>

          <section className="mb-14 fade-in" style={{ animationDelay: "420ms" }}>
            <Trending />
          </section>

          <footer className="mt-24 pt-6 border-t border-[#1e4465] text-xs text-gray-500 space-y-2">
            <p className="uppercase tracking-[0.3em] text-[10px] text-[#7fd0ff]/80">
              unplugged // protocol
            </p>
            <p>
              For community engagement and experimentation. Not financial advice.
              Participation is voluntary and no profit is promised or implied.
            </p>
            <p>
              Non-custodial tooling. Your wallet signs every trade. By connecting a
              wallet you acknowledge and accept these terms.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
