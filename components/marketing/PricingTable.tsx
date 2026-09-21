"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { PLANS, PLAN_ORDER, type BillingCycle } from "@/lib/pricing/plans";
import { quotePrice } from "@/lib/pricing/engine";

/**
 * Pricing with a monthly/yearly toggle.
 *
 * Both cycles are quoted through `quotePrice` — the same helper the checkout
 * uses — so the page cannot advertise a number the billing engine would not
 * charge. The yearly saving is computed from those two quotes rather than
 * asserted as a marketing claim.
 *
 * `launchActive` is resolved on the server (it reads env) and passed in, so
 * this component stays pure and the promotional window cannot be faked from
 * the browser.
 */
export function PricingTable({ launchActive }: { launchActive: boolean }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <>
      <div className="mt-8 flex justify-center">
        <div
          role="radiogroup"
          aria-label="Billing cycle"
          className="inline-flex rounded-lg border border-base-700 p-0.5"
        >
          {(["monthly", "yearly"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={cycle === option}
              onClick={() => setCycle(option)}
              className={clsx(
                "rounded-md px-4 py-1.5 text-sm capitalize transition-colors duration-fast",
                cycle === option ? "bg-base-800 text-neon-cyan" : "text-ink-400 hover:text-ink-100"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const quote = quotePrice({ planId, cycle, launchActive });
          const featured = planId === "pro";

          // Per-month equivalent, so the two cycles are comparable at a glance.
          const perMonthCents = cycle === "yearly" ? Math.round(quote.amountCents / 12) : quote.amountCents;
          const monthlyQuote = quotePrice({ planId, cycle: "monthly", launchActive });
          const yearlySavingPct =
            monthlyQuote.amountCents > 0
              ? Math.round((1 - quotePrice({ planId, cycle: "yearly", launchActive }).amountCents / (monthlyQuote.amountCents * 12)) * 100)
              : 0;

          return (
            <div
              key={planId}
              className={clsx("neon-card flex flex-col p-6", featured && "border-neon-cyan/40")}
            >
              {featured && (
                <span className="mb-3 inline-flex w-fit rounded-full border border-neon-cyan/30 bg-neon-cyan/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neon-cyan">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-lg font-bold">{plan.name}</h3>
              <p className="mt-3 font-display text-3xl font-bold">
                {perMonthCents === 0 ? "Free" : formatCents(perMonthCents)}
                {perMonthCents > 0 && <span className="ml-1 text-sm font-normal text-ink-600">/mo</span>}
              </p>

              {cycle === "yearly" && quote.amountCents > 0 && (
                <p className="mt-1 text-xs text-ink-600">
                  {formatCents(quote.amountCents)} billed yearly
                  {yearlySavingPct > 0 && <span className="text-neon-green"> · save {yearlySavingPct}%</span>}
                </p>
              )}
              {quote.isLaunchPrice && quote.amountCents > 0 && (
                <p className="mt-1.5 text-xs text-neon-violet">Launch pricing — 20% off</p>
              )}

              <p className="mt-2 font-mono text-xs text-neon-cyan">
                {plan.creditsPerMonth.toLocaleString()} credits / month
              </p>
              <Link
                href="/signup"
                className={clsx("mt-6 w-full", featured ? "btn-primary" : "btn-secondary")}
              >
                {quote.amountCents === 0 ? "Start free" : `Choose ${plan.name}`}
              </Link>
            </div>
          );
        })}
      </div>
    </>
  );
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}
