"use client";

import { useState } from "react";
import { startCheckout } from "@/lib/actions/billing";
import { createClient } from "@/lib/supabase/client";
import type { PlanId, BillingCycle } from "@/lib/pricing/plans";

export function CheckoutButton({
  planId,
  cycle,
  label,
}: {
  planId: PlanId;
  cycle: BillingCycle;
  label: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const result = await startCheckout(planId, cycle);
      if (result.error || !result.intent) {
        setError(result.error ?? "Couldn't start checkout.");
        return;
      }
      if (!window.Paddle) {
        setError("Payment system is still loading — try again in a moment.");
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      window.Paddle.Checkout.open({
        items: [{ priceId: result.intent.priceId, quantity: 1 }],
        customer: user?.email ? { email: user.email } : undefined,
        // Read by app/api/webhooks/paddle/route.ts on the 'activate' event —
        // this is how we know which org a brand-new subscription belongs to,
        // since our subscriptions row has no paddle_subscription_id to
        // match against until this first checkout completes.
        customData: { org_id: result.intent.orgId },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={loading} className="btn-primary w-full">
        {loading ? "Loading…" : label}
      </button>
      {error && <p className="text-neon-pink text-xs mt-2">{error}</p>}
    </div>
  );
}
