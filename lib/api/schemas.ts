import { z } from "zod";
import { MAX_MESSAGE_CHARS } from "./validate";

/**
 * Conversation history is replayed into the model on every turn, so its size
 * directly drives cost and latency. These bounds are the only point at which
 * that can be limited before the tokens are spent.
 */
export const MAX_HISTORY_TURNS = 50;
export const MAX_HISTORY_CHARS = 8000;

export const playgroundMessageSchema = z.object({
  message: z.string().min(1, "message is required").max(MAX_MESSAGE_CHARS, `message must be at most ${MAX_MESSAGE_CHARS} characters`),
  company_name: z.string().max(200).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(MAX_HISTORY_CHARS),
      })
    )
    .max(MAX_HISTORY_TURNS, `history must be at most ${MAX_HISTORY_TURNS} turns`)
    .optional(),
  session_id: z.string().max(200).optional(),
  memory_enabled: z.boolean().optional(),
});

export type PlaygroundMessage = z.infer<typeof playgroundMessageSchema>;
