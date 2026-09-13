import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Cpu, Flag, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { MetricCard } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/States";
import { formatDuration } from "@/lib/data/run-metrics";

const STEP_META: Record<string, { icon: typeof Cpu; label: string; tone: string }> = {
  retrieve: { icon: BookOpen, label: "Knowledge retrieval", tone: "text-neon-cyan" },
  model: { icon: Cpu, label: "Model call", tone: "text-neon-violet" },
  tool: { icon: Wrench, label: "Tool call", tone: "text-neon-green" },
  agent: { icon: Flag, label: "Agent", tone: "text-ink-400" },
};

export default async function RunDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const db = createClient();

  const { data: run } = await db
    .from("agent_runs")
    .select(
      "id, agent_id, deployment_id, status, input, output, trace, duration_ms, token_usage, cost_usd, error, created_at, agents(name)"
    )
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .single();

  if (!run) notFound();

  const embed = run.agents as unknown as { name: string } | { name: string }[] | null;
  const agentName = (Array.isArray(embed) ? embed[0]?.name : embed?.name) ?? "Deleted agent";
  const trace = Array.isArray(run.trace) ? (run.trace as Array<Record<string, unknown>>) : [];
  const tokens = (run.token_usage ?? {}) as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard/runs"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        All runs
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">Run</p>
          <h1 className="font-mono text-2xl font-bold tracking-tight">{run.id.slice(0, 8)}</h1>
          <p className="mt-2 text-sm text-ink-400">
            <Link href={`/dashboard/agents/${run.agent_id}`} className="hover:text-neon-cyan">
              {agentName}
            </Link>{" "}
            · {new Date(run.created_at).toLocaleString()} ·{" "}
            {run.deployment_id ? "triggered via API" : "run from the dashboard"}
          </p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      {run.error && (
        <div className="mb-6">
          <ErrorState
            title="This run failed"
            description="The error recorded when the execution stopped."
            details={run.error}
          />
        </div>
      )}

      <section aria-label="Run metrics" className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Duration" value={formatDuration(run.duration_ms)} />
        <MetricCard label="Steps" value={trace.length} />
        <MetricCard
          label="Tokens"
          value={
            typeof tokens.total_tokens === "number"
              ? tokens.total_tokens.toLocaleString()
              : typeof tokens.input_tokens === "number" && typeof tokens.output_tokens === "number"
                ? (tokens.input_tokens + tokens.output_tokens).toLocaleString()
                : "—"
          }
        />
        <MetricCard label="Recorded cost" value={`$${Number(run.cost_usd ?? 0).toFixed(4)}`} />
      </section>

      <div className="neon-card mb-6 p-5">
        <h2 className="mb-1 text-lg font-bold">Execution trace</h2>
        <p className="mb-5 text-xs text-ink-600">
          Each step the runtime recorded, in order.
        </p>
        {trace.length === 0 ? (
          <p className="text-sm text-ink-600">No trace steps were recorded for this run.</p>
        ) : (
          <ol className="space-y-2">
            {trace.map((step, i) => {
              const kind = typeof step.step === "string" ? step.step : "agent";
              const meta = STEP_META[kind] ?? STEP_META.agent;
              const Icon = meta.icon;
              const failed = step.status === "failed";
              return (
                <li
                  key={i}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border px-3.5 py-2.5 ${
                    failed ? "border-neon-pink/30 bg-neon-pink/5" : "border-base-700"
                  }`}
                >
                  <span className="font-mono text-[10px] text-ink-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <Icon size={14} className={`shrink-0 ${meta.tone}`} aria-hidden="true" />
                  <span className="text-sm">{meta.label}</span>
                  <span className="ml-auto flex flex-wrap items-center gap-3 font-mono text-[11px] text-ink-600">
                    {typeof step.model === "string" && <span>{step.model}</span>}
                    {typeof step.provider === "string" && <span>{step.provider}</span>}
                    {typeof step.name === "string" && <span>{step.name}</span>}
                    {typeof step.sources === "number" && <span>{step.sources} sources</span>}
                    {typeof step.status === "string" && (
                      <span className={failed ? "text-neon-pink" : "text-neon-green"}>
                        {step.status}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PayloadPanel title="Input" value={run.input} />
        <PayloadPanel title="Output" value={run.output ?? null} emptyLabel="No output recorded." />
      </div>
    </div>
  );
}

function PayloadPanel({
  title,
  value,
  emptyLabel = "Nothing recorded.",
}: {
  title: string;
  value: unknown;
  emptyLabel?: string;
}) {
  const isEmpty = value === null || value === undefined;
  return (
    <div className="neon-card p-5">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {isEmpty ? (
        <p className="text-sm text-ink-600">{emptyLabel}</p>
      ) : (
        <pre
          tabIndex={0}
          className="max-h-80 overflow-auto rounded-lg border border-base-700 bg-base-900 p-3 font-mono text-xs text-ink-400"
        >
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  );
}
