import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePriceEnvVar } from "../lib/pricing/paddle-price-map";

test("maps every paid plan x cycle combination to the expected env var name", () => {
  assert.equal(resolvePriceEnvVar("starter", "monthly"), "PADDLE_PRICE_STARTER_MONTHLY");
  assert.equal(resolvePriceEnvVar("starter", "yearly"), "PADDLE_PRICE_STARTER_YEARLY");
  assert.equal(resolvePriceEnvVar("pro", "monthly"), "PADDLE_PRICE_PRO_MONTHLY");
  assert.equal(resolvePriceEnvVar("pro", "yearly"), "PADDLE_PRICE_PRO_YEARLY");
  assert.equal(resolvePriceEnvVar("business", "monthly"), "PADDLE_PRICE_BUSINESS_MONTHLY");
  assert.equal(resolvePriceEnvVar("business", "yearly"), "PADDLE_PRICE_BUSINESS_YEARLY");
});

test("throws for the free plan rather than returning a meaningless env var", () => {
  assert.throws(() => resolvePriceEnvVar("free", "monthly"));
});
