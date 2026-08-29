import { createHmac, timingSafeEqual } from "node:crypto";

// Paddle Billing signs webhooks as: "ts=<unix_seconds>;h1=<hex_hmac>"
// where the HMAC is computed over `${ts}:${rawBody}` using the webhook
// secret. See PADDLE_WEBHOOK_SECRET in .env.example.

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

const MAX_CLOCK_SKEW_SECONDS = 5 * 60; // reject old/replayed signatures

export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): VerifyResult {
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((kv) => kv.split("=") as [string, string])
  );
  const ts = parts.ts;
  const h1 = parts.h1;

  if (!ts || !h1) {
    return { valid: false, reason: "malformed signature header" };
  }

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) {
    return { valid: false, reason: "malformed timestamp" };
  }
  if (Math.abs(nowSeconds - tsNum) > MAX_CLOCK_SKEW_SECONDS) {
    return { valid: false, reason: "timestamp outside allowed window (possible replay)" };
  }

  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(h1, "hex");
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return { valid: false, reason: "signature mismatch" };
  }

  return { valid: true };
}

// ---------- Event routing ----------

export type PaddleEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.canceled"
  | "transaction.completed"
  | "transaction.payment_failed";

export interface SubscriptionUpdateIntent {
  action: "activate" | "update" | "cancel" | "mark_past_due" | "ignore";
  paddleSubscriptionId?: string;
}

/**
 * Pure mapping from a webhook event type to what should happen to the
 * subscription row. Kept separate from the actual DB write so the routing
 * decision is testable without a database.
 */
export function routePaddleEvent(eventType: string): SubscriptionUpdateIntent {
  switch (eventType as PaddleEventType) {
    case "subscription.created":
      return { action: "activate" };
    case "subscription.updated":
      return { action: "update" };
    case "subscription.canceled":
      return { action: "cancel" };
    case "transaction.payment_failed":
      return { action: "mark_past_due" };
    case "transaction.completed":
    default:
      return { action: "ignore" };
  }
}
