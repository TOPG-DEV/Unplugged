"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";

const NAV = [
  { href: "/", label: "Terminal" },
  { href: "/book", label: "Book" },
  { href: "/admin/new-call", label: "New Call" },
];

export function AdminNav() {
  const { publicKey } = useWallet();
  const pathname = usePathname();

  const adminKey = process.env.NEXT_PUBLIC_KC_CALL_WALLET ?? "";
  const isAdmin = publicKey != null && adminKey && publicKey.toBase58() === adminKey;
  if (!isAdmin) return null;

  return (
    <nav
      aria-label="Admin"
      // Sits below the ticker tape (~38px) and above all content
      className="fixed top-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 border border-white/15 bg-black/85 backdrop-blur-md rounded-full px-2 py-1 shadow-2xl"
    >
      <span
        className="text-[9px] uppercase tracking-[0.3em] text-[#d0291d] px-2"
        style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 700 }}
      >
        ADMIN
      </span>
      <span className="text-white/20">│</span>
      {NAV.map((item) => {
        const active = item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-[10px] uppercase tracking-wider px-3 py-1 rounded-full transition-colors ${
              active
                ? "text-white bg-white/10"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
            style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 600 }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default AdminNav;
