import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Coins,
  Database,
  Gauge,
  ListChecks,
  Plus,
  Rocket,
  Workflow,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { usageStatus } from "@/lib/pricing/entitlements";
import { UsageMeter } from "@/components/dashboard/UsageMeter";
import { summarizeRuns, formatDuration, formatRelativeTime, type RunRow } from "@/lib/data/run-metrics";
import { MetricCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";

/** Runs are summarised over a rolling 30-day window so the rate reflects current behaviour. */
const METRIC_WINDOW_DAYS = 30;

export default async function DashboardPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const since = new Date(Date.now() - METRIC_WINDOW_DAYS * 86_400_000).toISOString();

  const [
    { data: agents },
    { count: workflowCount },
    { count: datasetCount },
    { data: runRows },
    { data: recentRuns },
  ] = await Promise.all([
    supabase
      .from("agents")
      .select("id, name, kind, status, created_at, updated_at")
      .eq("org_id", ctx.orgId)
      .order("updated_at", { ascending: false }),
    supabase.from("workflows").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId),
    supabase.from("datasets").select("id", { count: "exact", head: true }).eq("org_id", ctx.orgId),
    // Status + duration only: enough for every metric below, without pulling
    // run inputs and outputs across the wire for a summary card.
    supabase
      .from("agent_runs")
      .select("status, duration_ms, created_at")
      .eq("org_id", ctx.orgId)
      .gte("created_at", since),
    supabase
      .from("agent_runs")
      .select("id, agent_id, status, duration_ms, created_at, error")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const agentList = agents ?? [];
  const activeAgents = agentList.filter((a) => a.status === "ready").length;
  const recentAgents = agentList.slice(0, 5);
  const metrics = summarizeRuns((runRows ?? []) as RunRow[]);

  const agentNames = new Map(agentList.map((a) => [a.id, a.name]));
  const activity = recentRuns ?? [];
  const failures = activity.filter((run) => run.status === "failed");

  // Only offer "Test" when there is something ready to test.
  const testableAgent = agentList.find((a) => a.kind === "ai" && a.status === "ready");

  return (
    <div className="mx-auto max-w-6xl">
      <section className="mb-7 rounded-2xl border border-base-700 bg-aurora-grid p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">
              Agentmi workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Build AI agents that work for you{ctx.orgName ? `, ${ctx.orgName}` : ""}.
            </h1>
            <p className="mt-3 max-w-2xl text-ink-400">
              Create agents, connect knowledge and tools, test behavior, and move working agents into
              production.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/dashboard/create" className="btn-primary">
              <Plus size={16} aria-hidden="true" />
              Create Agent
            </Link>
            <Link href="/dashboard/agents" className="btn-secondary">
              View agents
            </Link>
          </div>
        </div>
      </section>

      {/* Shown for every plan; the meter itself decides whether a prompt is
          warranted, so a healthy balance renders the bar and nothing more. */}
      <UsageMeter status={usageStatus(ctx.plan, ctx.creditBalance)} className="mb-7" />

      <section aria-label="Workspace metrics" className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Agents"
          value={agentList.length}
          hint={`${activeAgents} ready for use`}
          icon={Bot}
        />
        <MetricCard label="Workflows" value={workflowCount ?? 0} hint="Agent routing workflows" icon={Workflow} />
        <MetricCard label="Datasets" value={datasetCount ?? 0} hint="ML data sources" icon={Database} />
        <MetricCard
          label="Credits"
          value={ctx.isAdmin ? "Unlimited" : ctx.creditBalance.toLocaleString()}
          hint={`${ctx.plan} plan`}
          icon={Coins}
          tone={ctx.isAdmin ? "accent" : ctx.creditBalance > 0 ? "default" : "danger"}
        />
      </section>

      <section aria-label="Execution metrics" className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Runs"
          value={metrics.total}
          hint={`Last ${METRIC_WINDOW_DAYS} days`}
          icon={ListChecks}
        />
        <MetricCard
          label="Success rate"
          value={metrics.successRate === null ? "—" : `${metrics.successRate}%`}
          hint={metrics.successRate === null ? "No completed runs yet" : `${metrics.failed} failed`}
          icon={CheckCircle2}
          tone={successTone(metrics.successRate)}
        />
        <MetricCard
          label="Avg latency"
          value={formatDuration(metrics.averageLatencyMs)}
          hint={metrics.p95LatencyMs === null ? "No timing recorded" : `P95 ${formatDuration(metrics.p95LatencyMs)}`}
          icon={Gauge}
        />
        <MetricCard
          label="Plan"
          value={ctx.plan}
          hint="Manage in Billing"
          icon={Activity}
          tone="accent"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="neon-card p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Recent agents</h2>
                <p className="mt-1 text-xs text-ink-600">Your latest agent builds and their current state.</p>
              </div>
              <Link
                href="/dashboard/agents"
                className="inline-flex items-center gap-1 text-xs text-neon-cyan hover:underline"
              >
                View all
                <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>

            {recentAgents.length === 0 ? (
              <EmptyState
                icon={Bot}
                title="Your workspace is ready."
                description="Create your first agent and Agentmi will guide you through the setup."
                action={
                  <Link href="/dashboard/create" className="btn-primary">
                    <Plus size={16} aria-hidden="true" />
                    Create your first agent
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-col divide-y divide-base-700">
                {recentAgents.map((agent) => (
                  <li key={agent.id}>
                    <Link
                      href={`/dashboard/agents/${agent.id}`}
                      className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-4 transition-colors hover:bg-base-800/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{agent.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-ink-600">
                          {agent.kind} agent · updated {formatRelativeTime(agent.updated_at ?? agent.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={agent.status} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="neon-card p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Recent activity</h2>
                <p className="mt-1 text-xs text-ink-600">The last executions across this workspace.</p>
              </div>
              <Link
                href="/dashboard/runs"
                className="inline-flex items-center gap-1 text-xs text-neon-cyan hover:underline"
              >
                All runs
                <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>

            {activity.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No runs yet"
                description="Test an agent in the playground or call it over the API — every execution shows up here."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-base-700">
                {activity.map((run) => (
                  <li key={run.id}>
                    <Link
                      href={`/dashboard/runs/${run.id}`}
                      className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-base-800/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {agentNames.get(run.agent_id) ?? "Deleted agent"}
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-ink-600">
                          {formatRelativeTime(run.created_at)} · {formatDuration(run.duration_ms)}
                        </p>
                      </div>
                      <StatusBadge status={run.status} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="neon-card neon-card--accent-violet p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-neon-violet">Quick actions</p>
            <div className="mt-4 grid gap-2">
              <Link href="/dashboard/create" className="btn-secondary justify-start">
                <Plus size={15} aria-hidden="true" />
                Create agent
              </Link>
              <Link href="/dashboard/workflows" className="btn-secondary justify-start">
                <Workflow size={15} aria-hidden="true" />
                Create workflow
              </Link>
              {testableAgent ? (
                <Link
                  href={`/dashboard/agents/${testableAgent.id}/test`}
                  className="btn-secondary justify-start"
                >
                  <Bot size={15} aria-hidden="true" />
                  Test an agent
                </Link>
              ) : (
                <span
                  className="btn-secondary justify-start cursor-not-allowed opacity-40"
                  aria-disabled="true"
                  title="Create a ready AI agent first"
                >
                  <Bot size={15} aria-hidden="true" />
                  Test an agent
                </span>
              )}
              <Link href="/dashboard/deployments" className="btn-secondary justify-start">
                <Rocket size={15} aria-hidden="true" />
                Deploy
              </Link>
            </div>
          </div>

          <div className="neon-card p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-ink-600">Agent health</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-400">Ready agents</span>
                <span className="tabular-nums">
                  {activeAgents}/{agentList.length}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-base-700"
                role="progressbar"
                aria-valuenow={agentList.length ? Math.round((activeAgents / agentList.length) * 100) : 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Share of agents ready for use"
              >
                <div
                  className="h-full bg-neon-green"
                  style={{
                    width: `${agentList.length ? (activeAgents / agentList.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {failures.length > 0 && (
            <div className="rounded-card border border-neon-pink/30 bg-neon-pink/5 p-5">
              <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-neon-pink">
                <AlertTriangle size={13} aria-hidden="true" />
                Recent failures
              </p>
              <ul className="mt-4 space-y-3">
                {failures.slice(0, 3).map((run) => (
                  <li key={run.id}>
                    <Link href={`/dashboard/runs/${run.id}`} className="group block">
                      <p className="truncate text-sm text-ink-100 group-hover:underline">
                        {agentNames.get(run.agent_id) ?? "Deleted agent"}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-xs text-ink-600">
                        {run.error ?? "Execution failed"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}

/** Green at or above 95%, amber down to 80%, pink below. Neutral until there is data. */
function successTone(rate: number | null): "default" | "success" | "warning" | "danger" {
  if (rate === null) return "default";
  if (rate >= 95) return "success";
  if (rate >= 80) return "warning";
  return "danger";
}
