import { test } from "node:test";
import assert from "node:assert/strict";
import { routeToSpecialist, type Specialist } from "../lib/agent-builder/route-workflow";

const SPECIALISTS: Specialist[] = [
  { id: "s1", name: "Billing", description: "Handles invoices, payments, refunds, and subscription changes", keywords: ["billing", "charge"] },
  { id: "s2", name: "Technical Support", description: "Handles bugs, errors, login issues, and product troubleshooting", keywords: ["bug", "error"] },
  { id: "s3", name: "Sales", description: "Handles pricing questions, demos, and upgrade requests" },
];

test("routes a billing-related message to the Billing specialist", () => {
  const result = routeToSpecialist("I was charged twice for my subscription, can I get a refund?", SPECIALISTS);
  assert.equal(result.specialistId, "s1");
  assert.ok(result.matchedTerms.length > 0);
});

test("routes a bug report to Technical Support", () => {
  const result = routeToSpecialist("I keep getting an error when I try to log in", SPECIALISTS);
  assert.equal(result.specialistId, "s2");
});

test("routes a pricing question to Sales", () => {
  const result = routeToSpecialist("What's the pricing for the upgrade to Pro?", SPECIALISTS);
  assert.equal(result.specialistId, "s3");
});

test("falls back to the first specialist when there's no term overlap at all", () => {
  const result = routeToSpecialist("asdkjfh qpwoeiru", SPECIALISTS);
  assert.equal(result.specialistId, "s1");
  assert.equal(result.score, 0);
});

test("keywords count toward the match even if not in the description", () => {
  const result = routeToSpecialist("there's a bug in the checkout flow", SPECIALISTS);
  assert.equal(result.specialistId, "s2");
});

test("throws when given an empty specialist list", () => {
  assert.throws(() => routeToSpecialist("hello", []));
});

test("is case-insensitive and ignores punctuation", () => {
  const result = routeToSpecialist("REFUND!!! my invoice ASAP", SPECIALISTS);
  assert.equal(result.specialistId, "s1");
});

test("stop words don't influence routing", () => {
  // "help" and "with" are stop words — only "invoice" should drive the match
  const result = routeToSpecialist("can you help me with my invoice", SPECIALISTS);
  assert.equal(result.specialistId, "s1");
});
