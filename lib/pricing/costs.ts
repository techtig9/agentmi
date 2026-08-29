// Credit cost per action. Kept separate from plans.ts so cost tuning
// (to protect margin) never requires touching plan/price definitions.

export type BillableAction =
  | "create_ai_agent"
  | "create_ml_agent"
  | "retrain_agent"
  | "dataset_upload"
  | "deploy_agent"
  | "ai_message"
  | "ml_prediction";

export const FUNCTION_COSTS: Record<BillableAction, number> = {
  create_ai_agent: 150,
  create_ml_agent: 400,
  retrain_agent: 60,
  dataset_upload: 100,
  deploy_agent: 50,
  ai_message: 2,
  ml_prediction: 1,
};

// Org's very first AI or ML agent build is discounted so they get a
// working result before the real per-build cost applies to build #2+.
export const FIRST_BUILD_DISCOUNT = 0.5;

export function creditCostFor(
  action: BillableAction,
  opts: { isFirstBuildForOrg?: boolean } = {}
): number {
  const base = FUNCTION_COSTS[action];
  const isDiscountable = action === "create_ai_agent" || action === "create_ml_agent";
  if (opts.isFirstBuildForOrg && isDiscountable) {
    return Math.round(base * FIRST_BUILD_DISCOUNT);
  }
  return base;
}
