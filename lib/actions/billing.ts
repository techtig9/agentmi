"use server";

import { getOrgContext, requireRole } from "@/lib/data/org-context";
import { resolvePriceEnvVar } from "@/lib/pricing/paddle-price-map";
import { PLAN_ORDER, type PlanId, type BillingCycle } from "@/lib/pricing/plans";

export interface CheckoutIntent {
  priceId: string;
  orgId: string;
  planId: PlanId;
}

export type StartCheckoutState = { error: string | null; intent?: CheckoutIntent };

export async function startCheckout(planId: PlanId, cycle: BillingCycle): Promise<StartCheckoutState> {
  if (planId === "free") return { error: "Nothing to check out for the Free plan." };
  if (!PLAN_ORDER.includes(planId)) return { error: "Unknown plan." };

  const ctx = await getOrgContext();
  const denied = requireRole(ctx, ["owner"]);
  if (denied) return { error: denied };

  const envVar = resolvePriceEnvVar(planId, cycle);
  const priceId = process.env[envVar];
  if (!priceId) {
    // Missing config, not a user error — logged for the operator, generic
    // message for the person trying to pay.
    console.error(`startCheckout: ${envVar} is not set`);
    return { error: "Checkout isn't available right now — please contact support." };
  }

  return { error: null, intent: { priceId, orgId: ctx.orgId, planId } };
}
