import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { KnowledgeManager } from "@/components/dashboard/KnowledgeManager";
import { EmbedSnippet } from "@/components/dashboard/EmbedSnippet";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  ready: "text-neon-green",
  draft: "text-ink-400",
  training: "text-neon-cyan",
  failed: "text-neon-pink",
  archived: "text-ink-600",
};

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
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">{agent.name}</h1>
        <span className={`text-sm font-mono ${STATUS_COLOR[agent.status] ?? "text-ink-400"}`}>
          {agent.status}
        </span>
      </div>
      <p className="text-ink-600 text-xs uppercase tracking-wide mb-6">
        {agent.kind} agent · {agent.theme.replace("_", " ")} theme
      </p>

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
  const { count: chunkCount } = await supabase
    .from("knowledge_chunks")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .eq("org_id", orgId);

  return (
    <div className="flex flex-col gap-4">
      <KnowledgeManager agentId={agentId} chunkCount={chunkCount ?? 0} /><Link href={`/dashboard/agents/${agentId}/memory`} className="btn-secondary">Manage persistent memory</Link>
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
