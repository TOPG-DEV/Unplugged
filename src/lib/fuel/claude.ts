import Anthropic from "@anthropic-ai/sdk";
import { FUEL_SYSTEM_PROMPT } from "./prompt";
import type { FuelTurn } from "@/lib/types/fuel";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY missing");
  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * Generate a Fuel reply for a free-chat (non-command) message.
 * System prompt is marked cache_control: ephemeral — after first hit per
 * 5-min window, cost drops ~48% per Pitfall FUEL-4.
 * History is the last 6 turns (balance persona continuity vs token cost per D-10).
 */
export async function fuelReply(userMsg: string, history: FuelTurn[]): Promise<string> {
  const client = getClient();
  const last6 = history.slice(-6).map((t) => ({ role: t.role, content: t.content }));

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: [
      {
        type: "text",
        text: FUEL_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      ...last6,
      { role: "user" as const, content: userMsg },
    ],
  });

  const block = response.content[0];
  if (block?.type === "text") return block.text;
  return "";
}
