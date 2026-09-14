import Link from "next/link";
import { AlertTriangle, Coins, TrendingDown, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { MetricCard } from "@/components/ui/Card";
import { BarList, RangeTabs } from "@/components/ui/Chart";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/States";
import { rangeOption, rangeStart, RANGE_OPTIONS, formatRelativeTime } from "@/lib/data/run-metrics";
import {
  summarizeCreditUsage,
  labelForReason,
  LOW_CREDIT_DAYS,
  type LedgerEntry,
} from "@/lib/data/credit-usage";
import { PLANS } from "@/lib/pricing/plans";

export default async function UsagePage({ searchParams }: { searchParams: { range?: string } }) {
  const ctx = await getOrgContext();
  const db = createClient();
  const range = rangeOption(searchParams.range);

  const { data: entries } = await db
    .from("credit_ledger")
    .select("amount, entry_type, reason, created_at")
    .eq("org_id", ctx.orgId)
    .gte("created_at", rangeStart(range.id))
    .order("created_at", { ascending: false })
    .limit(2000);

  const rows = (entries ?? []) as LedgerEntry[];
  const windowDays = range.hours / 24;
  const usage = summarizeCreditUsage(rows, windowDays, ctx.creditBalance);
  const plan = PLANS[ctx.plan];
  const lowCredits =
    !ctx.isAdmin && usage.daysRemaining !== null && usage.daysRemaining <= LOW_CREDIT_DAYS;

  return (
    <PlatformPage
      eyebrow="Manage"
      title="Usage & Costs"
      description="Where your credits went, taken from the billing ledger — the same record the app charges against."
      action={{ href: "/dashboard/billing", label: "Manage billing" }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-600">Showing the last {range.label}.</p>
        <RangeTabs options={RANGE_OPTIONS} active={range.id} basePath="/dashboard/usage" />
      </div>

      {lowCredits && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-neon-amber/40 bg-neon-amber/5 p-4"
        >
          <AlertTriangle size={18} className="shrink-0 text-neon-amber" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm text-ink-100">
            At your current rate you have roughly{" "}
            <strong>{usage.daysRemaining} days</strong> of credits left. Agents stop running when
            the balance reaches zero.
          </p>
          <Link href="/dashboard/billing" className="btn-primary shrink-0 !px-4 !py-2 text-sm">
            Upgrade
          </Link>
        </div>
      )}

      <section aria-label="Credit metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Balance"
          value={ctx.isAdmin ? "Unlimited" : ctx.creditBalance.toLocaleString()}
          hint={`${plan.name} plan`}
          icon={Wallet}
          tone={ctx.isAdmin ? "accent" : ctx.creditBalance > 0 ? "default" : "danger"}
        />
        <MetricCard
          label="Used"
          value={usage.spent.toLocaleString()}
          hint={`In the last ${range.label}`}
          icon={TrendingDown}
        />
        <MetricCard
          label="Added"
          value={usage.granted.toLocaleString()}
          hint="Grants, top-ups and refunds"
          icon={Coins}
        />
        <MetricCard
          label="Daily burn"
          value={usage.dailyBurn === null ? "—" : Math.round(usage.dailyBurn).toLocaleString()}
          hint={
            usage.daysRemaining === null
              ? "No spend recorded"
              : `~${usage.daysRemaining} days left`
          }
          tone={lowCredits ? "warning" : "default"}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="neon-card p-5">
          <h2 className="mb-1 text-lg font-bold">What used credits</h2>
          <p className="mb-5 text-xs text-ink-600">Spend by action in this range.</p>
          <BarList
            items={usage.byReason}
            caption="Credits spent per action"
            emptyMessage="No credits spent in this range."
            valueSuffix=" credits"
          />
          <p className="mt-5 border-t border-base-700 pt-4 text-xs text-ink-600">
            Projected runway is a straight-line extrapolation of the burn above, not a forecast.
          </p>
        </div>

        <div className="neon-card p-5">
          <h2 className="mb-1 text-lg font-bold">Ledger</h2>
          <p className="mb-5 text-xs text-ink-600">
            Every credit movement, newest first.
          </p>
          {rows.length === 0 ? (
            <EmptyState
              icon={Coins}
              title="No credit activity"
              description="Building agents, sending messages and running predictions all draw credits. Activity in this range will appear here."
            />
          ) : (
            <Table caption="Credit ledger entries">
              <THead>
                <TR>
                  <TH>Action</TH>
                  <TH>Type</TH>
                  <TH align="right">Credits</TH>
                  <TH align="right">When</TH>
                </TR>
              </THead>
              <TBody>
                {rows.slice(0, 100).map((entry, i) => {
                  const spent = entry.amount < 0 || entry.entry_type === "consume";
                  const magnitude = Math.abs(entry.amount);
                  return (
                    <TR key={i}>
                      <TD>{labelForReason(entry.reason)}</TD>
                      <TD mono>{entry.entry_type}</TD>
                      <TD align="right" mono className={spent ? "text-neon-pink" : "text-neon-green"}>
                        {spent ? "−" : "+"}
                        {magnitude.toLocaleString()}
                      </TD>
                      <TD align="right" mono>
                        {formatRelativeTime(entry.created_at)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      </div>
    </PlatformPage>
  );
}
