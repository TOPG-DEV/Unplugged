export interface FuelTurn {
  role: "user" | "assistant";
  content: string;
  ts: number;           // unix ms — for sorting only; not sent to LLM
}

/**
 * Mongo doc — collection `fuel_memory`, keyed on Telegram user_id.
 * TTL index on updated_at @ 2592000s (30d) so inactive users roll off.
 */
export interface FuelMemoryDoc {
  user_id: string;       // telegram from.id as string
  username: string | null;  // telegram @handle, null if user has none set
  turns: FuelTurn[];     // enforced <= 20 via $push + $slice:-20 on write
  first_seen: Date;
  updated_at: Date;      // TTL anchor
}

/**
 * Mongo doc — collection `fuel_seen_updates`, keyed on update_id.
 * TTL index on seen_at @ 90s — just long enough to catch re-deliveries.
 */
export interface FuelSeenUpdateDoc {
  update_id: number;
  seen_at: Date;
}

/**
 * Command handler return value. Commands produce a reply string; the bot
 * layer calls ctx.reply() with it and persists the turn.
 */
export interface CommandResult {
  reply: string;
  parse_mode?: "HTML" | "MarkdownV2";  // default HTML per Pitfall FUEL-1 (simpler escape rules)
  disable_web_page_preview?: boolean;
}
