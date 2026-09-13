import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { AgentsExplorer } from "@/components/dashboard/AgentsExplorer";
import type { AgentListItem } from "@/lib/agents/filter";

/**
 * How many recent runs to scan when working out each agent's last activity.
 *
 * A bounded scan rather than a per-agent query: one capped read beats N round
 * trips, and an agent whose last run falls outside this window simply shows no
 * recent activity instead of a wrong timestamp.
 */
const RUN_LOOKBACK_ROWS = 500;

export default async function AgentsPage() {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const [{ data: agents }, { data: sources }, { data: runs }] = await Promise.all([
    supabase
      .from("agents")
      .select("id, name, kind, status, config, created_at, updated_at")
      .eq("org_id", ctx.orgId)
      .order("updated_at", { ascending: false }),
    // One row per knowledge source (not per chunk), so this stays small.
    supabase
      .from("knowledge_sources")
      .select("agent_id, chunk_count, status")
      .eq("org_id", ctx.orgId),
    supabase
      .from("agent_runs")
      .select("agent_id, created_at")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(RUN_LOOKBACK_ROWS),
  ]);

  const sourceStats = new Map<string, { sources: number; chunks: number }>();
  for (const source of sources ?? []) {
    const entry = sourceStats.get(source.agent_id) ?? { sources: 0, chunks: 0 };
    entry.sources += 1;
    entry.chunks += source.chunk_count ?? 0;
    sourceStats.set(source.agent_id, entry);
  }

  // Runs arrive newest-first, so the first entry seen per agent is its latest.
  const lastRunAt = new Map<string, string>();
  for (const run of runs ?? []) {
    if (!lastRunAt.has(run.agent_id)) lastRunAt.set(run.agent_id, run.created_at);
  }

  const items: AgentListItem[] = (agents ?? []).map((agent) => {
    const config = (agent.config ?? {}) as Record<string, unknown>;
    const stats = sourceStats.get(agent.id) ?? { sources: 0, chunks: 0 };

    return {
      id: agent.id,
      name: agent.name,
      kind: agent.kind,
      status: agent.status,
      description: typeof config.description === "string" ? config.description : "",
      model: typeof config.model === "string" && config.model.trim() ? config.model : null,
      toolCount: Array.isArray(config.tools) ? config.tools.length : 0,
      knowledgeSources: stats.sources,
      knowledgeChunks: stats.chunks,
      createdAt: agent.created_at,
      updatedAt: agent.updated_at ?? agent.created_at,
      lastRunAt: lastRunAt.get(agent.id) ?? null,
    };
  });

  // Archiving and restoring are owner/admin operations server-side; hiding the
  // menu entries for everyone else keeps the UI honest about what will work.
  const canArchive = ctx.isAdmin || ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-neon-cyan">Build</p>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-400">
            Every AI and ML agent in this workspace, with its knowledge, tools and latest activity.
          </p>
        </div>
        <Link href="/dashboard/create" className="btn-primary shrink-0">
          <Plus size={16} aria-hidden="true" />
          Create Agent
        </Link>
      </div>

      <AgentsExplorer agents={items} canArchive={canArchive} />
    </div>
  );
}
