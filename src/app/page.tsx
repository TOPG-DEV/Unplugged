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
        <div className="w-full max-w-5xl">
          {/* Hero */}
          <section
            className="relative rounded-2xl overflow-hidden mb-12 fade-in border border-white/5"
            style={{ animationDelay: "120ms" }}
          >
            <HeroAscii />
            <header className="relative z-10 px-4 md:px-8 pt-14 pb-10">
              <h1
                className="text-white leading-[0.85] select-none"
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontWeight: 900,
                  fontSize: "clamp(4rem, 17vw, 14rem)",
                  letterSpacing: "-0.045em",
                }}
              >
                UNPLUGGED
              </h1>
              <p
                className="mt-4 text-[10px] md:text-xs uppercase text-white/60"
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.45em",
                }}
              >
                a protocol, not a product
              </p>

              <div className="mt-7">
                <FuelBadge />
              </div>

              <p
                className="mt-10 text-2xl md:text-3xl leading-[1.05] text-white max-w-2xl"
                style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700, letterSpacing: "-0.02em" }}
              >
                Step out of the circle.
              </p>
              <p
                className="mt-4 text-sm md:text-base leading-relaxed text-white/55 max-w-xl"
                style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 400 }}
              >
                Mainstream noise is engineered to keep you reacting. Unplugged is the terminal for the ones already out — signed calls, smart-wallet flow, one-click execution. Careless. Emotionless. Still playing.
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

          <footer className="mt-24 pt-6 border-t border-white/10 text-xs text-white/40 space-y-2">
            <p
              className="uppercase text-[10px] text-white/60"
              style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 600, letterSpacing: "0.35em" }}
            >
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
