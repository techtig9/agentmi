import type { PlanId, BillingCycle } from "./plans";

export type PaddlePriceEnvVar =
  | "PADDLE_PRICE_STARTER_MONTHLY"
  | "PADDLE_PRICE_STARTER_YEARLY"
  | "PADDLE_PRICE_PRO_MONTHLY"
  | "PADDLE_PRICE_PRO_YEARLY"
  | "PADDLE_PRICE_BUSINESS_MONTHLY"
  | "PADDLE_PRICE_BUSINESS_YEARLY";

/**
 * Maps a paid plan + cycle to the env var holding its Paddle Price ID.
 *
 * Deliberately does NOT vary by launch-pricing status: launch pricing
 * (Section 9 of the PRD) is a percentage discount applied via a Paddle
 * discount/coupon at checkout time, not a separate Price object — a
 * single Price per plan×cycle keeps this mapping simple and keeps the
 * discount logic entirely inside Paddle's dashboard, not duplicated here.
 */
export function resolvePriceEnvVar(planId: PlanId, cycle: BillingCycle): PaddlePriceEnvVar {
  if (planId === "free") {
    throw new Error("resolvePriceEnvVar: the free plan has no Paddle price — nothing to check out");
  }

  const planKey = planId.toUpperCase();
  const cycleKey = cycle.toUpperCase();
  return `PADDLE_PRICE_${planKey}_${cycleKey}` as PaddlePriceEnvVar;
}
