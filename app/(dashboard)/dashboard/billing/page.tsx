import { getOrgContext } from "@/lib/data/org-context";
import { PaddleLoader } from "@/components/dashboard/PaddleLoader";
import { PricingCards } from "@/components/dashboard/PricingCards";

function isLaunchPricingActive(): boolean {
  if (process.env.LAUNCH_PRICING_ENABLED !== "true") return false;
  const endsAt = process.env.LAUNCH_PRICING_ENDS_AT;
  if (!endsAt) return false;
  return Date.now() < new Date(endsAt).getTime();
}

export default async function BillingPage() {
  const ctx = await getOrgContext();
  const launchActive = isLaunchPricingActive();

  return (
    <div className="max-w-3xl">
      <PaddleLoader />
      <h1 className="text-2xl font-bold mb-1">Billing</h1>
      <p className="text-ink-400 text-sm mb-6">
        You&apos;re on the <span className="capitalize text-ink-100">{ctx.plan}</span> plan with{" "}
        {ctx.isAdmin ? "unlimited admin access" : `${ctx.creditBalance.toLocaleString()} credits`}.
      </p>

      <PricingCards currentPlan={ctx.plan} launchActive={launchActive} />

      <p className="text-xs text-ink-600 mt-6">
        Payments are handled by Paddle. After checkout, your plan updates automatically once
        Paddle confirms the payment — this can take a few seconds.
      </p>
    </div>
  );
}
