import { PLANS, PLAN_ORDER, type PlanId } from "./plans";

/**
 * Entitlements derived from one plan config.
 *
 * `lib/pricing/plans.ts` is the single source of truth for what a plan grants.
 * These helpers turn a balance into the states the UI needs — healthy, low,
 * exhausted — so "running low" means the same thing on the dashboard, the
 * usage page and any upgrade prompt, instead of three different thresholds
 * drifting apart.
 */

/** Below this share of the monthly allowance, we start warning. */
export const LOW_BALANCE_RATIO = 0.15;

export type UsageLevel = "healthy" | "low" | "exhausted";

export interface UsageStatus {
  planId: PlanId;
  allowance: number;
  remaining: number;
  used: number;
  /** 0-100, clamped. Percentage of the allowance consumed. */
  percentUsed: number;
  level: UsageLevel;
  /** The next plan up, or null when already on the largest plan. */
  nextPlan: PlanId | null;
}

export function usageStatus(planId: PlanId, remaining: number): UsageStatus {
  const allowance = PLANS[planId].creditsPerMonth;
  const safeRemaining = Math.max(0, remaining);
  const used = Math.max(0, allowance - safeRemaining);
  const percentUsed = allowance > 0 ? Math.min(100, Math.round((used / allowance) * 100)) : 0;

  const level: UsageLevel =
    safeRemaining <= 0 ? "exhausted" : safeRemaining / allowance <= LOW_BALANCE_RATIO ? "low" : "healthy";

  const index = PLAN_ORDER.indexOf(planId);
  const nextPlan = index >= 0 && index < PLAN_ORDER.length - 1 ? PLAN_ORDER[index + 1] : null;

  return { planId, allowance, remaining: safeRemaining, used, percentUsed, level, nextPlan };
}

/**
 * The prompt to show, or null when there is nothing worth saying.
 *
 * Returns null for a healthy balance and for an account already on the
 * largest plan with credits left — a nudge with no available action is just
 * noise.
 */
export function upgradePrompt(status: UsageStatus): { tone: "warning" | "danger"; message: string } | null {
  if (status.level === "healthy") return null;

  const next = status.nextPlan ? PLANS[status.nextPlan] : null;
  const offer = next
    ? `${next.name} raises it to ${next.creditsPerMonth.toLocaleString()} credits a month.`
    : "Top up to keep running agents this cycle.";

  if (status.level === "exhausted") {
    return { tone: "danger", message: `You have used your ${status.allowance.toLocaleString()} monthly credits. ${offer}` };
  }
  return {
    tone: "warning",
    message: `${status.remaining.toLocaleString()} credits left this cycle. ${offer}`,
  };
}
