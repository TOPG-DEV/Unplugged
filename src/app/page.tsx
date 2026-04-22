"use client";

import CustomWalletButton from "@/components/ui/CustomWalletButton";
import Wire from "@/components/Wire";
import Tracker from "@/components/Tracker";
import Trending from "@/components/Trending";
import { FuelBadge } from "@/components/FuelBadge";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-start px-6 py-20">
      <div className="w-full max-w-3xl">
        <header className="mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">UNPLUGGED</h1>
          <p className="mt-4 text-sm uppercase tracking-[0.3em] text-[#7fd0ff]">
            The operator&apos;s channel
          </p>
          <div className="mt-4">
            <FuelBadge />
          </div>
        </header>

        <section className="mb-12">
          <p className="text-lg md:text-xl leading-relaxed text-gray-200 max-w-2xl">
            UNPLUGGED is the private terminal for operators who read the market
            before the market reads them. Signed calls. Smart-wallet tracking.
            Tools that show the move before the crowd. Connect a wallet to step inside.
          </p>
        </section>

        <section className="mb-12">
          <CustomWalletButton />
        </section>

        <section className="grid gap-4 md:grid-cols-2 mb-12">
          <Wire />
          <Tracker />
        </section>

        <section className="mb-12">
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
  );
}
