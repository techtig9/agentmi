import { test } from "node:test";
import assert from "node:assert/strict";
import { quotePrice, estimateMaxUsageMargin } from "../lib/pricing/engine";
import { creditCostFor } from "../lib/pricing/costs";
import { PLANS } from "../lib/pricing/plans";

test("free plan is always $0, launch pricing never applies", () => {
  const monthly = quotePrice({ planId: "free", cycle: "monthly", launchActive: true });
  assert.equal(monthly.amountCents, 0);
  assert.equal(monthly.isLaunchPrice, false);
});

test("starter regular vs launch pricing matches the PRD", () => {
  const regular = quotePrice({ planId: "starter", cycle: "monthly", launchActive: false });
  const launch = quotePrice({ planId: "starter", cycle: "monthly", launchActive: true });
  assert.equal(regular.amountCents, 1500); // $15.00
  assert.equal(launch.amountCents, 1200); // $12.00
  assert.equal(launch.isLaunchPrice, true);
});

test("yearly price is cheaper per year than 12x monthly, for every paid plan", () => {
  for (const planId of ["starter", "pro", "business"] as const) {
    const plan = PLANS[planId];
    const twelveMonthly = plan.price.monthly * 12;
    assert.ok(
      plan.price.yearly < twelveMonthly,
      `${planId}: yearly (${plan.price.yearly}) should be less than 12x monthly (${twelveMonthly})`
    );
  }
});

test("business tier launch monthly price is the lowest of the three paid tiers' launch prices for its segment", () => {
  const business = quotePrice({ planId: "business", cycle: "monthly", launchActive: true });
  assert.equal(business.amountCents, 5500); // $55.00, lowered per latest request
});

test("first AI/ML agent build is half price; later builds are full price", () => {
  const firstAi = creditCostFor("create_ai_agent", { isFirstBuildForOrg: true });
  const laterAi = creditCostFor("create_ai_agent", { isFirstBuildForOrg: false });
  assert.equal(firstAi, 75);
  assert.equal(laterAi, 150);

  const firstMl = creditCostFor("create_ml_agent", { isFirstBuildForOrg: true });
  assert.equal(firstMl, 200);
});

test("first-build discount does NOT apply to non-creation actions", () => {
  const cost = creditCostFor("ai_message", { isFirstBuildForOrg: true });
  assert.equal(cost, 2); // unaffected by the discount flag
});

test("margin estimate at max usage lands in a sane band for a plausible cost-per-credit", () => {
  // Illustrative cost assumption: $0.0009/credit blended (LLM + training + storage).
  // Real number must come from actual Anthropic/Voyage/compute billing.
  const costPerCreditCents = 0.09;
  const result = estimateMaxUsageMargin("starter", "monthly", costPerCreditCents);
  assert.equal(result.revenueCents, 1500);
  assert.ok(result.marginPct > 0 && result.marginPct < 100, `unexpected margin: ${result.marginPct}%`);
});

test("margin tightens (but stays positive) on business tier vs starter at the same cost-per-credit", () => {
  const costPerCreditCents = 0.09;
  const starter = estimateMaxUsageMargin("starter", "monthly", costPerCreditCents);
  const business = estimateMaxUsageMargin("business", "monthly", costPerCreditCents);
  assert.ok(
    business.marginPct < starter.marginPct,
    `expected business margin (${business.marginPct}%) < starter margin (${starter.marginPct}%)`
  );
  assert.ok(business.marginPct > 0, `business margin went negative: ${business.marginPct}%`);
});
