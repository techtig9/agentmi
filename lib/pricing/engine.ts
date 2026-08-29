import { PLANS, type PlanId, type BillingCycle } from "./plans";

export interface PriceQuoteInput {
  planId: PlanId;
  cycle: BillingCycle;
  launchActive: boolean;
}

export interface PriceQuote {
  planId: PlanId;
  cycle: BillingCycle;
  amountCents: number;
  isLaunchPrice: boolean;
}

/** Single source of truth for "what does this org get charged right now." */
export function quotePrice({ planId, cycle, launchActive }: PriceQuoteInput): PriceQuote {
  const plan = PLANS[planId];
  const table = launchActive && planId !== "free" ? plan.launchPrice : plan.price;
  const amountCents = table[cycle];
  return { planId, cycle, amountCents, isLaunchPrice: launchActive && planId !== "free" };
}

/**
 * Gross margin at MAXIMUM plan usage — i.e. the worst case where every
 * credit issued is actually spent. Real margin will be higher in practice
 * since most orgs don't burn 100% of their allotment.
 *
 * costPerCreditCents must come from a real blended cost estimate
 * (LLM tokens + training compute + storage) ÷ credits issued — see
 * PRD Section 9, "Margin Logic."
 */
export function estimateMaxUsageMargin(
  planId: PlanId,
  cycle: BillingCycle,
  costPerCreditCents: number,
  opts: { launchActive?: boolean } = {}
): { revenueCents: number; costCents: number; marginPct: number } {
  const plan = PLANS[planId];
  const { amountCents } = quotePrice({
    planId,
    cycle,
    launchActive: opts.launchActive ?? false,
  });

  const monthsCovered = cycle === "yearly" ? 12 : 1;
  const totalCredits = plan.creditsPerMonth * monthsCovered;
  const costCents = totalCredits * costPerCreditCents;
  const marginPct = amountCents === 0 ? 0 : ((amountCents - costCents) / amountCents) * 100;

  return { revenueCents: amountCents, costCents, marginPct: Math.round(marginPct * 10) / 10 };
}
