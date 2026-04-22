"use client";

import CustomWalletButton from "@/components/ui/CustomWalletButton";
import Wire from "@/components/Wire";
import Tracker from "@/components/Tracker";
import Trending from "@/components/Trending";
import { FuelBadge } from "@/components/FuelBadge";
import { TickerTape } from "@/components/TickerTape";
import { HeroAscii } from "@/components/HeroAscii";
import { AdminNav } from "@/components/AdminNav";

export default function Home() {
  return (
    <>
      <TickerTape />
      <AdminNav />
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-start px-6 pt-12 pb-20">
        <div className="w-full max-w-3xl">
          {/* Hero with cursor-follow ASCII background */}
          <section className="relative rounded-2xl overflow-hidden mb-14 fade-in">
            <HeroAscii />
            <header className="relative z-10 px-6 py-16 md:py-20">
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[0.95]">
                UNPLUGGED
              </h1>
              <p className="mt-4 text-xs md:text-sm uppercase tracking-[0.35em] text-[#7fd0ff]">
                The operator&apos;s terminal
              </p>
              <div className="mt-5">
                <FuelBadge />
              </div>
              <p className="mt-8 text-base md:text-lg leading-snug text-gray-200 max-w-xl">
                On-chain tools. Signed calls. No sockpuppets.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gray-400 max-w-xl">
                Track the move before the crowd. Read the wire, scan the mints, buy in one click. Connect a wallet to step inside.
              </p>
            </header>
          </section>

          <section className="mb-10 fade-in" style={{ animationDelay: "100ms" }}>
            <CustomWalletButton />
          </section>

          <section className="grid gap-4 md:grid-cols-2 mb-10 fade-in" style={{ animationDelay: "200ms" }}>
            <Wire />
            <Tracker />
          </section>

          <section className="mb-14 fade-in" style={{ animationDelay: "300ms" }}>
            <Trending />
          </section>

          <footer className="mt-24 pt-6 border-t border-[#1e4465] text-xs text-gray-500 space-y-2">
            <p>
              For community engagement and experimentation. Not financial advice.
              Participation is voluntary and no profit is promised or implied.
            </p>
            <p>
              Token-gated tooling. No monetary return guaranteed. By connecting a
              wallet you acknowledge and accept these terms.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
