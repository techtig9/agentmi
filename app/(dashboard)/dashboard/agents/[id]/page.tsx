import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { EmbedSnippet } from "@/components/dashboard/EmbedSnippet";
import { StatusBadge } from "@/components/ui/Badge";
import Link from "next/link";
import { ArrowLeft, BookOpen, Brain, Pencil, Play, Wrench } from "lucide-react";

export default async function AgentDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("id, name, kind, status, theme, config, created_at, public_widget_id")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .single();

  if (!agent) notFound();

  return (
    <div className="max-w-3xl">
      <Link
        href="/dashboard/agents"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-100"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        All agents
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <StatusBadge status={agent.status} />
          </div>
          <p className="mt-2 text-xs uppercase tracking-wide text-ink-600">
            {agent.kind} agent · {agent.theme.replace("_", " ")} theme
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {agent.kind === "ai" && agent.status === "ready" && (
            <Link href={`/dashboard/agents/${agent.id}/test`} className="btn-secondary">
              <Play size={15} aria-hidden="true" />
              Test
            </Link>
          )}
          <Link href={`/dashboard/agents/${agent.id}/builder`} className="btn-primary">
            <Pencil size={15} aria-hidden="true" />
            Edit
          </Link>
        </div>
      </div>

      {agent.kind === "ai" ? (
        <AiAgentPanel
          agentId={agent.id}
          orgId={ctx.orgId}
          publicWidgetId={agent.public_widget_id}
          isReady={agent.status === "ready"}
          plan={ctx.plan}
        />
      ) : (
        <MlAgentPanel agentId={agent.id} classNames={(agent.config as { class_names?: string[] })?.class_names ?? null} />
      )}
    </div>
  );
}

async function AiAgentPanel({
  agentId,
  orgId,
  publicWidgetId,
  isReady,
  plan,
}: {
  agentId: string;
  orgId: string;
  publicWidgetId: string;
  isReady: boolean;
  plan: string;
}) {
  const supabase = createClient();
  // Summary counts only. The full editors live on their own pages so this
  // overview stays readable rather than embedding every management surface.
  const [{ data: sources }, { count: memoryCount }] = await Promise.all([
    supabase
      .from("knowledge_sources")
      .select("chunk_count")
      .eq("agent_id", agentId)
      .eq("org_id", orgId),
    supabase
      .from("agent_memories")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .eq("org_id", orgId),
  ]);

  const sourceCount = sources?.length ?? 0;
  const chunkCount = (sources ?? []).reduce((sum, s) => sum + (s.chunk_count ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          icon={BookOpen}
          label="Knowledge"
          value={sourceCount === 0 ? "None" : `${sourceCount} sources`}
          hint={chunkCount ? `${chunkCount.toLocaleString()} chunks` : "Add sources to ground answers"}
          href={`/dashboard/agents/${agentId}/knowledge`}
        />
        <SummaryTile
          icon={Brain}
          label="Memory"
          value={memoryCount ? `${memoryCount} stored` : "Empty"}
          hint="Facts retained across conversations"
          href={`/dashboard/agents/${agentId}/memory`}
        />
        <SummaryTile
          icon={Wrench}
          label="Tools"
          value="Configure"
          hint="HTTP tools this agent may call"
          href={`/dashboard/agents/${agentId}/tools`}
        />
      </div>
      {isReady ? (
        <EmbedSnippet publicWidgetId={publicWidgetId} plan={plan} />
      ) : (
        <p className="text-xs text-ink-600">Widget embed code appears once the agent is ready.</p>
      )}
    </div>
  );
}

async function MlAgentPanel({ agentId, classNames }: { agentId: string; classNames: string[] | null }) {
  const supabase = createClient();

  const [{ data: model }, { data: dataset }, { data: recentPredictions }] = await Promise.all([
    supabase
      .from("ml_models")
      .select("version, algorithm, metrics, status, created_at")
      .eq("agent_id", agentId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("datasets")
      .select("row_count, target_column, column_profile")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("prediction_history")
      .select("input, output, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (!model) {
    return <div className="neon-card p-5 text-ink-400 text-sm">Training in progress or not started.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="neon-card p-5">
        <p className="font-display font-bold text-sm mb-3">
          Model v{model.version} — {model.algorithm}
        </p>
        {classNames && classNames.length > 0 && (
          <p className="text-xs text-ink-600 mb-3">Classes: {classNames.join(", ")}</p>
        )}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {Object.entries(model.metrics ?? {}).map(([key, value]) => (
            <div key={key} className="flex justify-between border-b border-base-700 pb-1">
              <dt className="text-ink-400 capitalize">{key.replace(/_/g, " ")}</dt>
              <dd className="font-mono text-neon-cyan">
                {typeof value === "number" ? value.toFixed(4) : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {dataset && (
        <div className="neon-card p-5 text-sm">
          <p className="text-ink-400 mb-1">
            Trained on {dataset.row_count} rows · target column{" "}
            <span className="text-ink-100 font-mono">{dataset.target_column}</span>
          </p>
        </div>
      )}
      {recentPredictions && recentPredictions.length > 0 && (
        <div className="neon-card p-5">
          <p className="font-display font-bold text-sm mb-3">Recent predictions</p>
          <div className="flex flex-col gap-2">
            {recentPredictions.map((p, i) => (
              <div key={i} className="text-xs border-b border-base-700 pb-1.5 flex justify-between gap-3">
                <code className="font-mono text-ink-400 truncate">{JSON.stringify(p.input)}</code>
                <code className="font-mono text-neon-cyan shrink-0">{JSON.stringify(p.output)}</code>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-ink-600">
        A prediction endpoint for feeding new rows through this model is live at{" "}
        <code className="font-mono">POST /api/v1/agents/{agentId}/predict</code> — see the API
        Keys page for a key to call it with.
      </p>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="neon-card p-4">
      <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-ink-600">
        <Icon size={12} aria-hidden="true" />
        {label}
      </span>
      <p className="mt-2 font-display font-bold">{value}</p>
      <p className="mt-1 text-xs text-ink-600">{hint}</p>
    </Link>
  );
}
