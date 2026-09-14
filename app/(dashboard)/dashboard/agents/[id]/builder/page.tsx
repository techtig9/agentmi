import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { AgentBuilder, type AgentBuilderData } from "@/components/dashboard/AgentBuilder";

export default async function AgentBuilderPage({ params }: { params: { id: string } }) {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: agent } = await supabase
    .from("agents")
    .select("id, name, kind, status, config, theme, templates(name)")
    .eq("id", params.id)
    .eq("org_id", ctx.orgId)
    .single();

  if (!agent) notFound();

  const [{ data: sources }, { count: memoryCount }] = await Promise.all([
    supabase
      .from("knowledge_sources")
      .select("chunk_count")
      .eq("org_id", ctx.orgId)
      .eq("agent_id", agent.id),
    supabase
      .from("agent_memories")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .eq("agent_id", agent.id),
  ]);

  const config = (agent.config ?? {}) as Record<string, unknown>;
  const template = agent.templates as unknown as { name: string } | null;

  const data: AgentBuilderData = {
    id: agent.id,
    name: agent.name,
    kind: agent.kind,
    status: agent.status,
    theme: agent.theme,
    description: asString(config.description),
    // The runtime accepts either key; `system_prompt` is the canonical one the
    // builder writes, with `prompt` still honoured for agents created earlier.
    systemPrompt: asString(config.system_prompt) || asString(config.prompt),
    model: asString(config.model),
    maxTokens: typeof config.max_tokens === "number" ? String(config.max_tokens) : "",
    templateName: template?.name ?? null,
    knowledgeSources: sources?.length ?? 0,
    knowledgeChunks: (sources ?? []).reduce((sum, s) => sum + (s.chunk_count ?? 0), 0),
    toolCount: Array.isArray(config.tools) ? config.tools.length : 0,
    memoryCount: memoryCount ?? 0,
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <Link
          href={`/dashboard/agents/${agent.id}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-100"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to agent
        </Link>
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">
          Agent Builder
        </p>
        <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-400">
          Configure identity, instructions, model limits, knowledge, memory and tools. Changes apply
          to the next run.
        </p>
      </div>

      <AgentBuilder agent={data} />
    </div>
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
