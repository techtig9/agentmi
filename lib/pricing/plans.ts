// All money values are in cents (USD) to avoid floating-point drift.
// These numbers must stay in sync with the PRD (Section 9 — Pricing & Packages).

export type PlanId = "free" | "starter" | "pro" | "business";
export type BillingCycle = "monthly" | "yearly";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  creditsPerMonth: number;
  price: {
    monthly: number; // regular price, cents/month
    yearly: number; // regular price, cents/year
  };
  launchPrice: {
    monthly: number; // first billing cycle only, cents/month
    yearly: number; // first year only, cents/year
  };
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    creditsPerMonth: 500,
    price: { monthly: 0, yearly: 0 },
    launchPrice: { monthly: 0, yearly: 0 },
  },
  starter: {
    id: "starter",
    name: "Starter",
    creditsPerMonth: 6000,
    price: { monthly: 1500, yearly: 14400 },
    launchPrice: { monthly: 1200, yearly: 11500 },
  },
  pro: {
    id: "pro",
    name: "Pro",
    creditsPerMonth: 20000,
    price: { monthly: 3900, yearly: 37200 },
    launchPrice: { monthly: 3100, yearly: 29800 },
  },
  business: {
    id: "business",
    name: "Business",
    creditsPerMonth: 60000,
    price: { monthly: 6900, yearly: 66000 },
    launchPrice: { monthly: 5500, yearly: 52800 },
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "business"];
