import { Activity, AlertTriangle, CheckCircle2, Gauge, ListChecks, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { MetricCard } from "@/components/ui/Card";
import { RunsOverTime, BarList, RangeTabs } from "@/components/ui/Chart";
import {
  summarizeRuns,
  bucketRuns,
  providerUsage,
  errorRate,
  formatDuration,
  rangeOption,
  rangeStart,
  RANGE_OPTIONS,
  type RunRow,
} from "@/lib/data/run-metrics";

export default async function ObservabilityPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const ctx = await getOrgContext();
  const db = createClient();
  const range = rangeOption(searchParams.range);

  // Ordered and range-bounded. The previous version took an unordered .limit(500)
  // and described it as "latest" — without an ORDER BY, Postgres returns an
  // arbitrary 500 rows, so the figures were not the latest anything.
  const { data: runs } = await db
    .from("agent_runs")
    .select("status, duration_ms, created_at, trace")
    .eq("org_id", ctx.orgId)
    .gte("created_at", rangeStart(range.id))
    .order("created_at", { ascending: false })
    .limit(5000);

  const rows = (runs ?? []) as Array<RunRow & { trace: unknown }>;
  const summary = summarizeRuns(rows);
  const series = bucketRuns(rows, range.id);
  const providers = providerUsage(rows);
  const errors = errorRate(summary);

  return (
    <PlatformPage
      eyebrow="Quality"
      title="Observability"
      description="Reliability and latency across every recorded execution. Figures are computed from the run ledger — nothing here is estimated."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-600">
          Showing the last {range.label}
          {rows.length >= 5000 && " (capped at the 5,000 most recent runs)"}.
        </p>
        <RangeTabs options={RANGE_OPTIONS} active={range.id} basePath="/dashboard/observability" />
      </div>

      <section aria-label="Reliability metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard label="Total runs" value={summary.total} icon={ListChecks} />
        <MetricCard
          label="Success rate"
          value={summary.successRate === null ? "—" : `${summary.successRate}%`}
          hint={summary.successRate === null ? "No completed runs" : `${summary.succeeded} succeeded`}
          icon={CheckCircle2}
          tone={successTone(summary.successRate)}
        />
        <MetricCard
          label="Error rate"
          value={errors === null ? "—" : `${errors}%`}
          hint={`${summary.failed} failed`}
          icon={AlertTriangle}
          tone={errors !== null && errors > 5 ? "danger" : "default"}
        />
        <MetricCard
          label="Average latency"
          value={formatDuration(summary.averageLatencyMs)}
          icon={Gauge}
        />
        <MetricCard
          label="P95 latency"
          value={formatDuration(summary.p95LatencyMs)}
          hint="95% of runs finish faster"
          icon={Timer}
        />
        <MetricCard
          label="In flight"
          value={summary.total - summary.succeeded - summary.failed}
          hint="Runs with no outcome yet"
          icon={Activity}
        />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="neon-card p-5">
          <h2 className="mb-1 text-lg font-bold">Runs over time</h2>
          <p className="mb-5 text-xs text-ink-600">
            Each column is one period in the selected range, split by outcome.
          </p>
          <RunsOverTime data={series} caption={`Runs per period over the last ${range.label}`} />
        </div>

        <div className="neon-card p-5">
          <h2 className="mb-1 text-lg font-bold">Provider usage</h2>
          <p className="mb-5 text-xs text-ink-600">
            Which model provider served each run, read from the recorded trace.
          </p>
          <BarList
            items={providers}
            caption="Runs served per provider"
            emptyMessage="No run in this range recorded a provider."
            valueSuffix=" runs"
          />
        </div>
      </div>
    </PlatformPage>
  );
}

function successTone(rate: number | null): "default" | "success" | "warning" | "danger" {
  if (rate === null) return "default";
  if (rate >= 95) return "success";
  if (rate >= 80) return "warning";
  return "danger";
}
