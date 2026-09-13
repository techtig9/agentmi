import Link from "next/link";
import { Bot, Database, Plus, Workflow, Coins, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { MetricCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";

export default async function DashboardPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const [{ data: agents }, { count: workflowCount }, { count: datasetCount }] = await Promise.all([
    supabase
      .from("agents")
      .select("id, name, kind, status, created_at")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false }),
    supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId),
    supabase
      .from("datasets")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId),
  ]);

  const agentList = agents ?? [];
  const readyAgents = agentList.filter((agent) => agent.status === "ready").length;
  const recentAgents = agentList.slice(0, 5);
  const readyPercent = agentList.length ? Math.round((readyAgents / agentList.length) * 100) : 0;

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
              Create agents, connect knowledge and tools, test behavior, and move working agents into production.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/dashboard/create" className="btn-primary">
              <Plus size={16} aria-hidden="true" />
              Create Agent
            </Link>
            <Link href="/dashboard/workflows" className="btn-secondary">
              Workflows
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Agents"
          value={agentList.length}
          hint={`${readyAgents} ready for use`}
          icon={Bot}
        />
        {/*
          These two are `count` from a head:true query. They were previously
          read as `data.length` — and a head:true query returns `data: null`,
          so both cards always rendered 0 no matter how many records existed.
        */}
        <MetricCard
          label="Workflows"
          value={workflowCount ?? 0}
          hint="Agent routing workflows"
          icon={Workflow}
        />
        <MetricCard
          label="Datasets"
          value={datasetCount ?? 0}
          hint="ML data sources"
          icon={Database}
        />
        <MetricCard
          label="Credits"
          value={ctx.isAdmin ? "Unlimited" : ctx.creditBalance.toLocaleString()}
          hint={`${ctx.plan} plan`}
          icon={Coins}
          tone={ctx.isAdmin ? "accent" : ctx.creditBalance > 0 ? "default" : "danger"}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
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
                        {agent.kind} agent
                      </p>
                    </div>
                    <StatusBadge status={agent.status} className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
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
              <Link href="/dashboard/datasets" className="btn-secondary justify-start">
                <Database size={15} aria-hidden="true" />
                Add dataset
              </Link>
            </div>
          </div>

          <div className="neon-card p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-ink-600">Workspace health</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-400">Ready agents</span>
                <span className="tabular-nums">
                  {readyAgents}/{agentList.length}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-base-700"
                role="progressbar"
                aria-valuenow={readyPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Share of agents ready for use"
              >
                <div className="h-full bg-neon-green" style={{ width: `${readyPercent}%` }} />
              </div>
              <p className="text-xs text-ink-600">
                Track execution history in{" "}
                <Link href="/dashboard/runs" className="text-neon-cyan hover:underline">
                  Runs
                </Link>
                , quality in{" "}
                <Link href="/dashboard/evaluations" className="text-neon-cyan hover:underline">
                  Evaluations
                </Link>
                , and live health in{" "}
                <Link href="/dashboard/observability" className="text-neon-cyan hover:underline">
                  Observability
                </Link>
                .
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
