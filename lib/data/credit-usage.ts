export interface LedgerEntry {
  amount: number;
  entry_type: string;
  reason: string;
  created_at: string;
}

export interface CreditUsageSummary {
  /** Credits spent in the window (a positive number). */
  spent: number;
  /** Credits added in the window (grants, top-ups, refunds). */
  granted: number;
  /** Spend per reason, biggest first. */
  byReason: Array<{ label: string; count: number }>;
  /** Mean spend per day over the window, or null when there is nothing to average. */
  dailyBurn: number | null;
  /** Days of runway at the current burn rate, or null when burn is zero/unknown. */
  daysRemaining: number | null;
}

/** Reasons map to the billable actions in lib/pricing/costs.ts. */
const REASON_LABELS: Record<string, string> = {
  create_ai_agent: "Agent builds",
  create_ml_agent: "ML agent builds",
  retrain_agent: "Model retraining",
  dataset_upload: "Dataset uploads",
  deploy_agent: "Deployments",
  ai_message: "Agent messages",
  ml_prediction: "Predictions",
  signup_grant: "Signup grant",
  monthly_grant: "Monthly grant",
  admin_override: "Admin adjustment",
};

export function labelForReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason.replace(/_/g, " ");
}

/**
 * Summarises credit movement from the ledger.
 *
 * Spend is derived from the ledger rather than recomputed from run counts, so
 * it matches what was actually charged — including the first-build discount and
 * any admin adjustment. Projection is a plain linear extrapolation of observed
 * burn and is labelled as such in the UI; it is not a forecast model.
 */
export function summarizeCreditUsage(
  entries: LedgerEntry[],
  windowDays: number,
  currentBalance: number
): CreditUsageSummary {
  let spent = 0;
  let granted = 0;
  const perReason = new Map<string, number>();

  for (const entry of entries) {
    if (entry.amount < 0 || entry.entry_type === "consume") {
      const magnitude = Math.abs(entry.amount);
      spent += magnitude;
      perReason.set(entry.reason, (perReason.get(entry.reason) ?? 0) + magnitude);
    } else {
      granted += entry.amount;
    }
  }

  const byReason = [...perReason.entries()]
    .map(([reason, count]) => ({ label: labelForReason(reason), count }))
    .sort((a, b) => b.count - a.count);

  const dailyBurn = windowDays > 0 && spent > 0 ? spent / windowDays : null;
  const daysRemaining =
    dailyBurn && dailyBurn > 0 ? Math.floor(currentBalance / dailyBurn) : null;

  return { spent, granted, byReason, dailyBurn, daysRemaining };
}

/** Below this many days of runway, the UI warns rather than just reporting. */
export const LOW_CREDIT_DAYS = 7;
