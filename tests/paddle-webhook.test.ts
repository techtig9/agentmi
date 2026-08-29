import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyPaddleSignature, routePaddleEvent } from "../lib/billing/paddle-webhook";

const SECRET = "test_webhook_secret";

function sign(body: string, ts: number, secret = SECRET): string {
  const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

test("valid signature at the current timestamp passes", () => {
  const body = JSON.stringify({ event_type: "subscription.created" });
  const now = Math.floor(Date.now() / 1000);
  const header = sign(body, now);
  const result = verifyPaddleSignature(body, header, SECRET, now);
  assert.equal(result.valid, true);
});

test("tampered body fails verification", () => {
  const body = JSON.stringify({ event_type: "subscription.created" });
  const now = Math.floor(Date.now() / 1000);
  const header = sign(body, now);
  const tamperedBody = JSON.stringify({ event_type: "subscription.canceled" });
  const result = verifyPaddleSignature(tamperedBody, header, SECRET, now);
  assert.equal(result.valid, false);
});

test("wrong secret fails verification", () => {
  const body = "{}";
  const now = Math.floor(Date.now() / 1000);
  const header = sign(body, now, "a_different_secret");
  const result = verifyPaddleSignature(body, header, SECRET, now);
  assert.equal(result.valid, false);
});

test("expired timestamp is rejected as a possible replay", () => {
  const body = "{}";
  const now = Math.floor(Date.now() / 1000);
  const oldTs = now - 10 * 60; // 10 minutes old, beyond the 5-minute window
  const header = sign(body, oldTs);
  const result = verifyPaddleSignature(body, header, SECRET, now);
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /replay/);
});

test("malformed header is rejected, not thrown", () => {
  const result = verifyPaddleSignature("{}", "garbage-header", SECRET);
  assert.equal(result.valid, false);
});

test("subscription.created routes to activate", () => {
  assert.equal(routePaddleEvent("subscription.created").action, "activate");
});

test("subscription.canceled routes to cancel", () => {
  assert.equal(routePaddleEvent("subscription.canceled").action, "cancel");
});

test("transaction.payment_failed routes to mark_past_due (drives dunning)", () => {
  assert.equal(routePaddleEvent("transaction.payment_failed").action, "mark_past_due");
});

test("unrecognized event type routes to ignore rather than throwing", () => {
  assert.equal(routePaddleEvent("some.future.event").action, "ignore");
});
