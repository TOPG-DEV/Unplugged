"use client";

import CustomWalletButton from "@/components/ui/CustomWalletButton";
import Wire from "@/components/Wire";
import Tracker from "@/components/Tracker";
import Trending from "@/components/Trending";
import { FuelBadge } from "@/components/FuelBadge";
import { TickerTape } from "@/components/TickerTape";
import { PageAscii } from "@/components/PageAscii";
import { AdminNav } from "@/components/AdminNav";
import { UnpluggedIntro } from "@/components/UnpluggedIntro";

export default function Home() {
  return (
    <>
      <UnpluggedIntro />
      <PageAscii />
      <TickerTape />
      <AdminNav />
      <main className="relative z-10 min-h-screen text-white flex flex-col items-center justify-start px-4 sm:px-6 pt-10 pb-20">
        <div className="w-full max-w-5xl">
          {/* Hero — black slab backdrop keeps wordmark crisp over the page-wide ASCII */}
          <section
            className="relative rounded-2xl overflow-hidden mb-10 md:mb-14 fade-in border border-white/5 bg-black/55 backdrop-blur-sm"
            style={{ animationDelay: "120ms" }}
          >
            <header className="relative z-10 px-4 sm:px-6 md:px-10 pt-10 md:pt-14 pb-8 md:pb-12">
              {/* Responsive wordmark — fits any viewport without overflow */}
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
                className="mt-3 md:mt-4 text-[9px] sm:text-[10px] md:text-xs uppercase text-white/60"
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.4em",
                }}
              >
                a protocol, not a product
              </p>

              <div className="mt-6 md:mt-7">
                <FuelBadge />
              </div>

              <p
                className="mt-8 md:mt-10 text-xl sm:text-2xl md:text-3xl leading-[1.05] text-white max-w-2xl"
                style={{
                  fontFamily: "'Archivo', sans-serif",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                Step out of the circle.
              </p>
              <p
                className="mt-3 md:mt-4 text-sm md:text-base leading-relaxed text-white/55 max-w-xl"
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

          <footer className="mt-20 md:mt-24 pt-6 border-t border-white/10 text-xs text-white/40 space-y-2">
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
