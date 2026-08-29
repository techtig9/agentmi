import { test } from "node:test";
import assert from "node:assert/strict";
import { signWebhookPayload, verifyWebhookSignature, type WebhookPayload } from "../lib/webhooks-outbound/sign";

const SECRET = "whsec_test_secret";
const SAMPLE_PAYLOAD: WebhookPayload = {
  event: "agent.training_completed",
  org_id: "org_123",
  agent_id: "agent_456",
  data: { accuracy: 0.94 },
  occurred_at: "2026-07-31T00:00:00Z",
};

test("a signature produced by signWebhookPayload verifies successfully", () => {
  const { body, signatureHeader } = signWebhookPayload(SAMPLE_PAYLOAD, SECRET, 1000);
  const result = verifyWebhookSignature(body, signatureHeader, SECRET, 1000);
  assert.equal(result.valid, true);
});

test("a tampered body is rejected", () => {
  const { body, signatureHeader } = signWebhookPayload(SAMPLE_PAYLOAD, SECRET, 1000);
  const tamperedBody = body.replace("0.94", "0.99");
  const result = verifyWebhookSignature(tamperedBody, signatureHeader, SECRET, 1000);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "signature mismatch");
});

test("the wrong secret is rejected", () => {
  const { body, signatureHeader } = signWebhookPayload(SAMPLE_PAYLOAD, SECRET, 1000);
  const result = verifyWebhookSignature(body, signatureHeader, "wrong_secret", 1000);
  assert.equal(result.valid, false);
});

test("a signature older than the allowed skew is rejected (replay protection)", () => {
  const { body, signatureHeader } = signWebhookPayload(SAMPLE_PAYLOAD, SECRET, 1000);
  const result = verifyWebhookSignature(body, signatureHeader, SECRET, 1000 + 400); // 400s later
  assert.equal(result.valid, false);
  assert.equal(result.reason, "timestamp outside allowed skew");
});

test("a malformed signature header is rejected without throwing", () => {
  const result = verifyWebhookSignature("{}", "not-a-real-header", SECRET, 1000);
  assert.equal(result.valid, false);
  assert.equal(result.reason, "malformed signature header");
});

test("verification is symmetric across a slight clock skew within tolerance", () => {
  const { body, signatureHeader } = signWebhookPayload(SAMPLE_PAYLOAD, SECRET, 1000);
  const result = verifyWebhookSignature(body, signatureHeader, SECRET, 1000 + 60); // 1 min later, within 5 min
  assert.equal(result.valid, true);
});
