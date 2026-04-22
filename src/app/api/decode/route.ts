import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import clientPromise from "@/lib/mongo";
import { fetchDexScreenerData } from "@/lib/scanner/dexscreener";
import { fetchRugcheckData } from "@/lib/scanner/rugcheck";

export const dynamic = "force-dynamic";

const MINT_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

const SYSTEM_PROMPT = `You are The Unplug Decoder — an operator-tone AI that reads Solana on-chain data and returns a sharp verdict on a token. You exist to cut through mainstream / CT narrative hype and tell the operator what's real.

Your voice: lowercase, sharp, meme-fluent, matter-of-fact. No apologies. No em-dashes. No hedging. No "might be" — commit to a call.

You will receive structured token data (price, liquidity, volume, pair age, holder concentration, honeypot flag, LP lock, smart-money presence, price change). Use that data to return a JSON verdict.

Rules:
- Honeypot flag === true → DANGER, unplug_score <= 5, action "don't touch"
- Tiny liquidity (<$20K) + big 24h volume (>5x liquidity) = exit liquidity play → NOISE, action "watch only"
- Top-10 concentration > 60% + new pair (<4h) = insider bundle → DANGER or NOISE
- Smart-money presence (>0 tracked wallets bought in last 1h) = real signal bump → add 10-25 to score
- No smart money + pure narrative heat (huge % move with low volume) = NOISE
- LP unlocked (red) + high concentration = DANGER regardless of pump
- Healthy: locked LP (green), dispersed top-10 (<30%), liquidity >= $50K, real volume, smart money present → SIGNAL
- Mixed cases with some good + some bad signals → MIXED

Always return exactly this JSON shape. No prose before/after. No markdown fences.

{
  "unplug_score": <integer 0-100>,
  "verdict": "SIGNAL" | "MIXED" | "NOISE" | "DANGER",
  "headline": "<one sentence, operator voice, lowercase, under 100 chars>",
  "reasoning": [
    "<fact 1 with number>",
    "<fact 2 with number>",
    "<fact 3 with number>"
  ],
  "action": "<imperative verb phrase under 40 chars>"
}`;

interface TokenDataBlock {
  ticker: string;
  mint: string;
  price_usd: number | null;
  mcap_usd: number | null;
  liquidity_usd: number | null;
  volume_24h_usd: number | null;
  change_1h_pct: number | null;
  change_24h_pct: number | null;
  pair_age_hours: number | null;
  honeypot: boolean | null;
  lp_locked_light: string | null;
  top10_holder_pct: number | null;
  smart_money_wallets_1h: number;
  smart_money_aliases: string[];
}

async function buildTokenData(mint: string): Promise<TokenDataBlock> {
  const [dexResult, rugResult] = await Promise.allSettled([
    fetchDexScreenerData(mint),
    fetchRugcheckData(mint),
  ]);

  // DexScreener scanner returns a flat summary — we need ticker + mcap
  // too, so hit the raw pair endpoint once more.
  let pair: {
    baseToken?: { symbol?: string };
    fdv?: number;
    marketCap?: number;
  } | null = null;
  try {
    const raw = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      { next: { revalidate: 30 } }
    );
    if (raw.ok) {
      const data = (await raw.json()) as {
        pairs?: Array<{
          chainId?: string;
          baseToken?: { symbol?: string };
          fdv?: number;
          marketCap?: number;
        }> | null;
      };
      pair = (data.pairs ?? []).find((p) => p.chainId === "solana") ?? null;
    }
  } catch {
    // pair stays null — decoder handles missing ticker gracefully
  }

  const dex = dexResult.status === "fulfilled" ? dexResult.value : null;
  const rug = rugResult.status === "fulfilled" ? rugResult.value : null;

  // Query smart money activity from our own trending_buckets
  let smartMoneyWallets = 0;
  const smartMoneyAliases: string[] = [];
  try {
    const client = await clientPromise;
    const db = client.db("unpluggedDB");
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const buckets = await db
      .collection<{
        mint: string;
        bucket_start: Date;
        unique_buyers: string[];
        smart_money_hits: string[];
      }>("trending_buckets")
      .find({ mint, bucket_start: { $gte: oneHourAgo } })
      .toArray();
    const buyerSet = new Set<string>();
    const aliasSet = new Set<string>();
    for (const b of buckets) {
      for (const u of b.unique_buyers ?? []) buyerSet.add(u);
      for (const a of b.smart_money_hits ?? []) aliasSet.add(a);
    }
    smartMoneyWallets = buyerSet.size;
    smartMoneyAliases.push(...aliasSet);
  } catch {
    // If trending collection doesn't exist yet, 0 is the right answer
  }

  return {
    ticker: pair?.baseToken?.symbol ? `$${pair.baseToken.symbol.toUpperCase()}` : mint.slice(0, 4),
    mint,
    price_usd: dex?.priceUsd ?? null,
    mcap_usd: pair?.fdv ?? pair?.marketCap ?? null,
    liquidity_usd: dex?.liquidityUsd ?? null,
    volume_24h_usd: dex?.volume24hUsd ?? null,
    change_1h_pct: dex?.priceChange1h ?? null,
    change_24h_pct: dex?.priceChange24h ?? null,
    pair_age_hours: dex?.pairAgeMs != null ? Math.round(dex.pairAgeMs / 3_600_000) : null,
    honeypot: rug?.honeypotFlag ?? null,
    lp_locked_light: rug?.lpLocked ?? null,
    top10_holder_pct: rug?.top10HolderPct ?? null,
    smart_money_wallets_1h: smartMoneyWallets,
    smart_money_aliases: smartMoneyAliases,
  };
}

interface DecodeResult {
  unplug_score: number;
  verdict: "SIGNAL" | "MIXED" | "NOISE" | "DANGER";
  headline: string;
  reasoning: string[];
  action: string;
}

function fallbackVerdict(data: TokenDataBlock): DecodeResult {
  // Used when Claude is unavailable or response parsing fails. Simple
  // rule-based verdict so the UI never breaks.
  const score = (() => {
    let s = 50;
    if (data.honeypot === true) return 2;
    if ((data.top10_holder_pct ?? 0) > 60) s -= 25;
    if (data.lp_locked_light === "red") s -= 20;
    if (data.lp_locked_light === "green") s += 10;
    if ((data.liquidity_usd ?? 0) < 20_000) s -= 15;
    if (data.smart_money_wallets_1h > 0) s += 15;
    if ((data.pair_age_hours ?? 0) < 4) s -= 10;
    return Math.max(0, Math.min(100, s));
  })();
  const verdict: DecodeResult["verdict"] =
    score <= 20 ? "DANGER" : score <= 45 ? "NOISE" : score <= 70 ? "MIXED" : "SIGNAL";
  return {
    unplug_score: score,
    verdict,
    headline: "decoder heuristic fallback — claude unavailable",
    reasoning: [
      `liquidity ${data.liquidity_usd ?? "?"} · 24h vol ${data.volume_24h_usd ?? "?"}`,
      `top-10 concentration ${data.top10_holder_pct ?? "?"}%`,
      `smart money in last 1h: ${data.smart_money_wallets_1h} wallets`,
    ],
    action: "re-run when decoder is back",
  };
}

export async function POST(req: Request) {
  let mint: string;
  try {
    const body = await req.json();
    mint = typeof body?.mint === "string" ? body.mint.trim() : "";
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!mint || !MINT_REGEX.test(mint)) {
    return NextResponse.json(
      { error: "paste a base58 spl mint (32-44 chars)" },
      { status: 400 }
    );
  }

  let data: TokenDataBlock;
  try {
    data = await buildTokenData(mint);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to fetch token data" },
      { status: 502 }
    );
  }

  // If we got nothing useful from DexScreener, return early
  if (data.price_usd == null && data.liquidity_usd == null) {
    return NextResponse.json(
      {
        unplug_score: 10,
        verdict: "NOISE" as const,
        headline: "no tradeable liquidity found. dead or unlaunched.",
        reasoning: [
          "dexscreener has no pair for this mint",
          "means: not tradeable on-chain right now",
          "could be brand-new (<5min) or abandoned",
        ],
        action: "wait for a pair to list",
        token: data,
      },
      { status: 200 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ...fallbackVerdict(data), token: data },
      { status: 200 }
    );
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Decode this token. Return only the JSON object.\n\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    });

    const block = response.content[0];
    if (block?.type !== "text") {
      return NextResponse.json(
        { ...fallbackVerdict(data), token: data },
        { status: 200 }
      );
    }
    const parsed = JSON.parse(block.text.trim()) as DecodeResult;
    // Sanity — ensure shape
    if (
      typeof parsed.unplug_score !== "number" ||
      !parsed.verdict ||
      !parsed.headline ||
      !Array.isArray(parsed.reasoning) ||
      !parsed.action
    ) {
      throw new Error("invalid decoder response shape");
    }
    parsed.unplug_score = Math.max(0, Math.min(100, Math.round(parsed.unplug_score)));
    return NextResponse.json({ ...parsed, token: data }, { status: 200 });
  } catch (err) {
    console.error("[decoder] claude error:", err);
    return NextResponse.json(
      { ...fallbackVerdict(data), token: data },
      { status: 200 }
    );
  }
}
