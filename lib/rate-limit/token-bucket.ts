// Token bucket: each key gets `capacity` tokens, refilling at
// `refillPerSecond`. Chosen over a fixed window because it allows
// short bursts (a legitimate widget user sending 3 messages quickly)
// while still enforcing a steady average rate — a fixed window would
// either be too strict on bursts or allow 2x the intended rate at a
// window boundary.

export interface BucketState {
  tokens: number;
  lastRefillMs: number;
}

export interface RateLimitConfig {
  capacity: number;
  refillPerSecond: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number; // 0 if allowed
}

export function createBucket(config: RateLimitConfig, nowMs: number): BucketState {
  return { tokens: config.capacity, lastRefillMs: nowMs };
}

function refill(bucket: BucketState, config: RateLimitConfig, nowMs: number): BucketState {
  const elapsedSeconds = Math.max(0, (nowMs - bucket.lastRefillMs) / 1000);
  const refilled = Math.min(config.capacity, bucket.tokens + elapsedSeconds * config.refillPerSecond);
  return { tokens: refilled, lastRefillMs: nowMs };
}

/** Pure — returns the new bucket state alongside the decision; caller owns persisting it. */
export function tryConsume(
  bucket: BucketState,
  config: RateLimitConfig,
  nowMs: number,
  cost = 1
): { bucket: BucketState; result: RateLimitResult } {
  const refilled = refill(bucket, config, nowMs);

  if (refilled.tokens >= cost) {
    return {
      bucket: { tokens: refilled.tokens - cost, lastRefillMs: nowMs },
      result: { allowed: true, remaining: Math.floor(refilled.tokens - cost), retryAfterMs: 0 },
    };
  }

  const tokensNeeded = cost - refilled.tokens;
  const retryAfterMs = Math.ceil((tokensNeeded / config.refillPerSecond) * 1000);
  return {
    bucket: refilled,
    result: { allowed: false, remaining: Math.floor(refilled.tokens), retryAfterMs },
  };
}
