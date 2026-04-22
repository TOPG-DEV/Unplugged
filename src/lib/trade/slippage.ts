import { SLIPPAGE_PRESETS, type SlippagePreset } from "@/lib/types/trade";

export const DEFAULT_SLIPPAGE_BPS = 100; // 1% per D-16
const STORAGE_KEY = "unplugged.slippage_preset";

/**
 * SSR-safe: returns "default" on the server, real value after hydration.
 * Callers should hydrate in useEffect so server and client agree on first paint.
 */
export function loadSlippagePreset(): SlippagePreset {
  if (typeof window === "undefined") return "default";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return "default";
    const found = SLIPPAGE_PRESETS.find((p) => p.key === raw);
    return found ? found.key : "default";
  } catch {
    return "default";
  }
}

export function saveSlippagePreset(preset: SlippagePreset): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, preset);
  } catch {
    // Private-browsing mode throws on setItem — ignore.
  }
}

export function presetToBps(preset: SlippagePreset): number {
  const found = SLIPPAGE_PRESETS.find((p) => p.key === preset);
  return found?.bps ?? DEFAULT_SLIPPAGE_BPS;
}
