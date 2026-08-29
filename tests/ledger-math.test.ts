import { test } from "node:test";
import assert from "node:assert/strict";
import { canAfford, applyGrant } from "../lib/credits/ledger-math";
import { creditCostFor } from "../lib/pricing/costs";

test("affordable action reduces balance by exactly the cost", () => {
  const result = canAfford(500, 150);
  assert.equal(result.allowed, true);
  assert.equal(result.balanceAfter, 350);
  assert.equal(result.shortfall, 0);
});

test("unaffordable action is blocked and reports the exact shortfall", () => {
  const result = canAfford(100, 150);
  assert.equal(result.allowed, false);
  assert.equal(result.balanceAfter, 100); // unchanged
  assert.equal(result.shortfall, 50);
});

test("exact-balance action is allowed (balance can legitimately hit zero)", () => {
  const result = canAfford(150, 150);
  assert.equal(result.allowed, true);
  assert.equal(result.balanceAfter, 0);
});

test("a new signup's 500 free credits cover exactly one first-build AI agent", () => {
  const firstBuildCost = creditCostFor("create_ai_agent", { isFirstBuildForOrg: true }); // 75
  const result = canAfford(500, firstBuildCost);
  assert.equal(result.allowed, true);
  assert.equal(result.balanceAfter, 425);
});

test("negative cost is rejected rather than silently granting credits", () => {
  assert.throws(() => canAfford(100, -50));
});

test("grant adds to balance", () => {
  assert.equal(applyGrant(500, 6000), 6500);
});

test("negative grant is rejected", () => {
  assert.throws(() => applyGrant(500, -10));
});
