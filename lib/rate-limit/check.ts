import { createServiceClient } from "@/lib/supabase/service";
import type { RateLimitConfig, RateLimitResult } from "./token-bucket";

// Per-surface limits. Widget is the most exposed (anonymous, no
// per-caller credential to revoke) so it gets the tightest limit;
// API-key callers are trusted developers and get more headroom.
export const RATE_LIMITS = {
  widgetChat: { capacity: 10, refillPerSecond: 10 / 60 } satisfies RateLimitConfig, // 10/min, bursty
  apiKeyPredict: { capacity: 60, refillPerSecond: 1 } satisfies RateLimitConfig, // 60/min steady
  apiKeyChat: { capacity: 30, refillPerSecond: 0.5 } satisfies RateLimitConfig, // 30/min steady
};

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  cost = 1
): Promise<RateLimitResult> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .rpc("rate_limit_check", {
      p_key: key,
      p_capacity: config.capacity,
      p_refill_per_second: config.refillPerSecond,
      p_now_ms: Date.now(),
      p_cost: cost,
    })
    .single();

  if (error || !data) {
    // Fail open: a rate-limit infrastructure hiccup shouldn't take down
    // the whole API. Errors here are logged for visibility, not silent.
    console.error("rate_limit_check failed, failing open:", error?.message);
    return { allowed: true, remaining: config.capacity, retryAfterMs: 0 };
  }

  const result = data as unknown as { allowed: boolean; remaining: number; retry_after_ms: number };
  return { allowed: result.allowed, remaining: result.remaining, retryAfterMs: Number(result.retry_after_ms) };
}
