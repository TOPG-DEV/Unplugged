"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ReactNode, useEffect, useState } from "react";
import CustomWalletButton from "@/components/ui/CustomWalletButton";

const ADMIN_WALLET = process.env.NEXT_PUBLIC_KC_CALL_WALLET;

/**
 * Client-side wallet-pubkey gate for /admin/* routes.
 *
 * SECURITY: this is a UX gate only. Every protected API route MUST
 * still verify the ed25519 signature server-side (see /api/calls).
 * Bypassing this component only hides the UI — it does not elevate.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();

  // Avoid hydration mismatch: wallet state only resolves client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (!ADMIN_WALLET) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400">NEXT_PUBLIC_KC_CALL_WALLET not configured.</p>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <p className="text-gray-300">Connect the KC Call wallet to continue.</p>
        <CustomWalletButton />
      </div>
    );
  }

  if (publicKey.toBase58() !== ADMIN_WALLET) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 uppercase tracking-wider">Access denied.</p>
        <p className="text-gray-500 text-sm mt-2">This wallet is not authorized.</p>
      </div>
    );
  }

  return <>{children}</>;
}
