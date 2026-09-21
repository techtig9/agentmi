import Link from "next/link";
import { AlertTriangle, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { PLANS } from "@/lib/pricing/plans";
import { upgradePrompt, type UsageStatus } from "@/lib/pricing/entitlements";

/**
 * Credit allowance as a meter, plus a prompt only when there is one worth
 * showing. Both come from `usageStatus`, so the bar and the message can never
 * disagree about whether the account is running low.
 */
export function UsageMeter({ status, className }: { status: UsageStatus; className?: string }) {
  const prompt = upgradePrompt(status);
  const plan = PLANS[status.planId];

  const barTone =
    status.level === "exhausted" ? "bg-neon-pink" : status.level === "low" ? "bg-neon-amber" : "bg-neon-cyan";

  return (
    <div className={clsx("neon-card p-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-sm font-bold">Credits this cycle</h2>
        <span className="font-mono text-xs text-ink-600">{plan.name} plan</span>
      </div>

      <p className="mt-3 font-mono text-2xl tabular-nums">
        {status.remaining.toLocaleString()}
        <span className="ml-1.5 text-sm text-ink-600">/ {status.allowance.toLocaleString()} left</span>
      </p>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-base-800"
        role="meter"
        aria-valuenow={status.percentUsed}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${status.percentUsed}% of monthly credits used`}
      >
        <div className={clsx("h-full rounded-full transition-all duration-slow", barTone)} style={{ width: `${status.percentUsed}%` }} />
      </div>

      {prompt && (
        <div
          className={clsx(
            "mt-4 flex items-start gap-2.5 rounded-lg border p-3 text-sm",
            prompt.tone === "danger"
              ? "border-neon-pink/30 bg-neon-pink/5 text-ink-100"
              : "border-neon-amber/30 bg-neon-amber/5 text-ink-100"
          )}
        >
          <AlertTriangle
            size={15}
            aria-hidden="true"
            className={clsx("mt-0.5 shrink-0", prompt.tone === "danger" ? "text-neon-pink" : "text-neon-amber")}
          />
          <div className="min-w-0">
            <p className="leading-relaxed">{prompt.message}</p>
            <Link
              href="/dashboard/billing"
              className="mt-2 inline-flex items-center gap-1.5 font-display text-xs font-bold text-neon-cyan hover:underline"
            >
              <TrendingUp size={13} aria-hidden="true" />
              Compare plans
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
