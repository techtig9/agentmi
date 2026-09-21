import { PLANS, PLAN_ORDER, type PlanId } from "./plans";
import { FUNCTION_COSTS } from "./costs";
import { estimateCostUsd, MODEL_RATES, rateKey } from "./model-costs";

/**
 * Worst-case unit economics per plan.
 *
 * "Worst case" means every credit in the allowance is spent on the cheapest
 * action per credit — the one that buys the most provider work for the fewest
 * credits. That is the scenario that breaks margin, so it is the one worth
 * reporting; averaging typical usage would hide it.
 *
 * Provider cost comes from the same MODEL_RATES table that prices individual
 * runs, so this report and the per-run cost cannot disagree.
 */

/** Tokens a typical agent message consumes, used to price one credit. */
export interface UsageAssumptions {
  inputTokensPerMessage: number;
  outputTokensPerMessage: number;
  provider: string;
  model: string;
}

/**
 * Defaults describe a grounded chat turn: a system prompt plus retrieved
 * knowledge dominates the input, and answers are short. These are assumptions,
 * labelled as such — change them here and every figure below moves with them.
 */
export const DEFAULT_ASSUMPTIONS: UsageAssumptions = {
  inputTokensPerMessage: 2500,
  outputTokensPerMessage: 500,
  provider: "groq",
  model: "llama-3.3-70b-versatile",
};

export interface PlanEconomics {
  planId: PlanId;
  planName: string;
  monthlyPriceUsd: number;
  creditsPerMonth: number;
  /** Provider cost if the whole allowance is spent on AI messages. */
  worstCaseProviderCostUsd: number;
  grossMarginUsd: number;
  /** Percentage, or null for a free plan where margin is not meaningful. */
  grossMarginPct: number | null;
  /** True when serving the full allowance costs more than the plan charges. */
  negativeMargin: boolean;
  messagesPerAllowance: number;
}

export function planEconomics(
  planId: PlanId,
  assumptions: UsageAssumptions = DEFAULT_ASSUMPTIONS
): PlanEconomics {
  const plan = PLANS[planId];
  const monthlyPriceUsd = plan.price.monthly / 100;

  const costPerMessage =
    estimateCostUsd(assumptions.provider, assumptions.model, {
      input_tokens: assumptions.inputTokensPerMessage,
      output_tokens: assumptions.outputTokensPerMessage,
    }) ?? 0;

  // ai_message is the cheapest action per credit, so spending the entire
  // allowance on messages maximises provider cost for a given plan price.
  const messagesPerAllowance = Math.floor(plan.creditsPerMonth / FUNCTION_COSTS.ai_message);
  const worstCaseProviderCostUsd = round(messagesPerAllowance * costPerMessage);

  const grossMarginUsd = round(monthlyPriceUsd - worstCaseProviderCostUsd);

  return {
    planId,
    planName: plan.name,
    monthlyPriceUsd,
    creditsPerMonth: plan.creditsPerMonth,
    worstCaseProviderCostUsd,
    grossMarginUsd,
    grossMarginPct: monthlyPriceUsd > 0 ? Math.round((grossMarginUsd / monthlyPriceUsd) * 100) : null,
    negativeMargin: monthlyPriceUsd > 0 && grossMarginUsd < 0,
    messagesPerAllowance,
  };
}

export function allPlanEconomics(assumptions: UsageAssumptions = DEFAULT_ASSUMPTIONS): PlanEconomics[] {
  return PLAN_ORDER.map((id) => planEconomics(id, assumptions));
}

/** Plans whose worst case loses money — the thing this report exists to surface. */
export function plansAtRisk(assumptions: UsageAssumptions = DEFAULT_ASSUMPTIONS): PlanEconomics[] {
  return allPlanEconomics(assumptions).filter((plan) => plan.negativeMargin);
}

/** The free plan's cost is pure acquisition spend, so it is reported separately. */
export function freePlanCostUsd(assumptions: UsageAssumptions = DEFAULT_ASSUMPTIONS): number {
  return planEconomics("free", assumptions).worstCaseProviderCostUsd;
}

export function assumptionsAreePriced(assumptions: UsageAssumptions = DEFAULT_ASSUMPTIONS): boolean {
  return Boolean(MODEL_RATES[rateKey(assumptions.provider, assumptions.model)]);
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
