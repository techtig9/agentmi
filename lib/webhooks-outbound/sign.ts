import { createHmac, timingSafeEqual } from "node:crypto";

// Mirrors the inbound Paddle scheme (lib/billing/paddle-webhook.ts) so
// customers verifying our outbound webhooks use a pattern they've likely
// already implemented: "ts=<unix_seconds>;h1=<hex_hmac>" over `${ts}:${body}`.

export type WebhookEventType =
  | "agent.created"
  | "agent.training_completed"
  | "agent.training_failed"
  | "knowledge.updated";

export interface WebhookPayload {
  event: WebhookEventType;
  org_id: string;
  agent_id: string;
  data: Record<string, unknown>;
  occurred_at: string; // ISO timestamp
}

export function signWebhookPayload(
  payload: WebhookPayload,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): { body: string; signatureHeader: string } {
  const body = JSON.stringify(payload);
  const hmac = createHmac("sha256", secret).update(`${nowSeconds}:${body}`).digest("hex");
  return { body, signatureHeader: `ts=${nowSeconds};h1=${hmac}` };
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

/** For documentation/SDK purposes — this is what we tell customers to run on their end. */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): VerifyResult {
  const parts = Object.fromEntries(
    signatureHeader.split(";").map((kv) => kv.split("=") as [string, string])
  );
  const { ts, h1 } = parts;
  if (!ts || !h1) return { valid: false, reason: "malformed signature header" };

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { valid: false, reason: "invalid timestamp" };
  if (Math.abs(nowSeconds - tsNum) > MAX_CLOCK_SKEW_SECONDS) {
    return { valid: false, reason: "timestamp outside allowed skew" };
  }

  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(h1, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { valid: false, reason: "signature mismatch" };
  }

  return { valid: true };
}
