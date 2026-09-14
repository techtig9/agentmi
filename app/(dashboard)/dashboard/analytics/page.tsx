import Link from "next/link";
import { Bot, CheckCircle2, Coins, Gauge, ListChecks, Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { PlatformPage } from "@/components/dashboard/PlatformPage";
import { MetricCard } from "@/components/ui/Card";
import { RunsOverTime, BarList, RangeTabs } from "@/components/ui/Chart";
import {
  summarizeRuns,
  bucketRuns,
  providerUsage,
  formatDuration,
  rangeOption,
  rangeStart,
  RANGE_OPTIONS,
  type RunRow,
} from "@/lib/data/run-metrics";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const ctx = await getOrgContext();
  const db = createClient();
  const range = rangeOption(searchParams.range);
  const since = rangeStart(range.id);

  const [{ count: agentCount }, { data: runRows }, { count: deploymentCount }, { data: agents }] =
    await Promise.all([
      db.from("agents").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId),
      db
        .from("agent_runs")
        .select("agent_id, status, duration_ms, created_at, trace")
        .eq("org_id", ctx.orgId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000),
      db
        .from("agent_deployments")
        .select("id", { count: "exact", head: true })
        .eq("org_id", ctx.orgId),
      db.from("agents").select("id, name").eq("org_id", ctx.orgId),
    ]);

  const rows = (runRows ?? []) as Array<RunRow & { agent_id: string; trace: unknown }>;

  /*
   * summarizeRuns is the single source of truth for these figures, shared with
   * the dashboard and Observability.
   *
   * This page previously counted runs whose status was 'completed' or 'success'
   * — but recordAgentRun only ever writes 'succeeded', 'failed' or 'running',
   * so the success count was always zero and the success rate always rendered
   * 0.0% no matter how well the workspace was actually doing.
   */
  const summary = summarizeRuns(rows);
  const series = bucketRuns(rows, range.id);
  const providers = providerUsage(rows);

  const agentNames = new Map((agents ?? []).map((a) => [a.id, a.name]));
  const perAgent = new Map<string, number>();
  for (const row of rows) {
    perAgent.set(row.agent_id, (perAgent.get(row.agent_id) ?? 0) + 1);
  }
  const agentUsage = [...perAgent.entries()]
    .map(([id, count]) => ({ label: agentNames.get(id) ?? "Deleted agent", count }))
    .sort((a, b) => b.count - a.count);

  return (
    <PlatformPage
      eyebrow="Manage"
      title="Analytics"
      description="Workspace performance calculated from recorded executions. Every figure traces back to a run you can open."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-600">Showing the last {range.label}.</p>
        <RangeTabs options={RANGE_OPTIONS} active={range.id} basePath="/dashboard/analytics" />
      </div>

      <section aria-label="Workspace metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard label="Agents" value={agentCount ?? 0} icon={Bot} />
        <MetricCard
          label="Runs"
          value={summary.total}
          hint={`In the last ${range.label}`}
          icon={ListChecks}
        />
        <MetricCard
          label="Success rate"
          value={summary.successRate === null ? "—" : `${summary.successRate}%`}
          hint={`${summary.succeeded} succeeded, ${summary.failed} failed`}
          icon={CheckCircle2}
          tone={successTone(summary.successRate)}
        />
        <MetricCard
          label="Average latency"
          value={formatDuration(summary.averageLatencyMs)}
          hint={summary.p95LatencyMs === null ? undefined : `P95 ${formatDuration(summary.p95LatencyMs)}`}
          icon={Gauge}
        />
        <MetricCard label="Deployments" value={deploymentCount ?? 0} icon={Rocket} />
        <MetricCard
          label="Credits"
          value={ctx.isAdmin ? "Unlimited" : ctx.creditBalance.toLocaleString()}
          hint={`${ctx.plan} plan`}
          icon={Coins}
        />
      </section>

      <div className="mt-6 neon-card p-5">
        <h2 className="mb-1 text-lg font-bold">Execution volume</h2>
        <p className="mb-5 text-xs text-ink-600">Runs per period, split by outcome.</p>
        <RunsOverTime data={series} caption={`Runs per period over the last ${range.label}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="neon-card p-5">
          <h2 className="mb-1 text-lg font-bold">Busiest agents</h2>
          <p className="mb-5 text-xs text-ink-600">Runs recorded per agent in this range.</p>
          <BarList
            items={agentUsage}
            caption="Runs per agent"
            emptyMessage="No runs in this range yet."
            valueSuffix=" runs"
          />
        </div>

        <div className="neon-card p-5">
          <h2 className="mb-1 text-lg font-bold">Provider usage</h2>
          <p className="mb-5 text-xs text-ink-600">Which provider served each run.</p>
          <BarList
            items={providers}
            caption="Runs per provider"
            emptyMessage="No run in this range recorded a provider."
            valueSuffix=" runs"
          />
        </div>
      </div>

      <p className="mt-6 text-xs text-ink-600">
        Looking for a specific execution?{" "}
        <Link href="/dashboard/runs" className="text-neon-cyan hover:underline">
          Browse runs
        </Link>
        .
      </p>
    </PlatformPage>
  );
}

function successTone(rate: number | null): "default" | "success" | "warning" | "danger" {
  if (rate === null) return "default";
  if (rate >= 95) return "success";
  if (rate >= 80) return "warning";
  return "danger";
}
