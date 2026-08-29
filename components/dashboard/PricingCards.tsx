"use client";

import { useState } from "react";
import { PLANS, type PlanId, type BillingCycle } from "@/lib/pricing/plans";
import { quotePrice } from "@/lib/pricing/engine";
import { CheckoutButton } from "./CheckoutButton";

const PAID_PLANS: PlanId[] = ["starter", "pro", "business"];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function PricingCards({ currentPlan, launchActive }: { currentPlan: PlanId; launchActive: boolean }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setCycle("monthly")}
          className={`text-sm px-3 py-1.5 rounded-full ${cycle === "monthly" ? "bg-neon-cyan text-base-950" : "text-ink-400"}`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setCycle("yearly")}
          className={`text-sm px-3 py-1.5 rounded-full ${cycle === "yearly" ? "bg-neon-cyan text-base-950" : "text-ink-400"}`}
        >
          Yearly <span className="opacity-70">— save 20%</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PAID_PLANS.map((planId) => {
          const plan = PLANS[planId];
          const quote = quotePrice({ planId, cycle, launchActive });
          const isCurrent = currentPlan === planId;

          return (
            <div key={planId} className="neon-card p-5 flex flex-col">
              <p className="font-display font-bold mb-1">{plan.name}</p>
              <p className="text-2xl font-bold mb-1">
                {formatCents(quote.amountCents)}
                <span className="text-sm text-ink-400 font-normal">/{cycle === "monthly" ? "mo" : "yr"}</span>
              </p>
              {quote.isLaunchPrice && (
                <p className="text-xs text-neon-violet mb-2">Launch pricing — 20% off</p>
              )}
              <p className="text-xs text-ink-600 mb-4">{plan.creditsPerMonth.toLocaleString()} credits/mo</p>

              <div className="mt-auto">
                {isCurrent ? (
                  <div className="text-center text-xs text-neon-green py-2.5">Current plan</div>
                ) : (
                  <CheckoutButton planId={planId} cycle={cycle} label={`Upgrade to ${plan.name}`} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
