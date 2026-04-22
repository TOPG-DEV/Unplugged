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
      className="fixed top-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 border border-[#1e4465] bg-[#060e15f0] backdrop-blur-md rounded-full px-2 py-1 shadow-xl"
    >
      <span className="text-[9px] uppercase tracking-[0.2em] text-[#d0291d] font-bold px-2">
        ADMIN
      </span>
      <span className="text-gray-600">│</span>
      {NAV.map((item) => {
        const active = item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-[10px] uppercase tracking-wider font-semibold px-3 py-1 rounded-full transition-colors ${
              active
                ? "text-[#7fd0ff] bg-[#0b1b2a]"
                : "text-gray-400 hover:text-[#7fd0ff] hover:bg-[#0b1b2a]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default AdminNav;
