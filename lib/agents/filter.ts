export type AgentKindFilter = "all" | "ai" | "ml";
export type AgentStatusFilter = "all" | "ready" | "draft" | "training" | "failed" | "archived";
export type AgentSort = "recent" | "oldest" | "name" | "activity";

export interface AgentListItem {
  id: string;
  name: string;
  kind: string;
  status: string;
  description: string;
  model: string | null;
  toolCount: number;
  knowledgeSources: number;
  knowledgeChunks: number;
  createdAt: string;
  updatedAt: string;
  /** ISO timestamp of the most recent recorded run, or null if never run. */
  lastRunAt: string | null;
}

export interface AgentFilters {
  query: string;
  kind: AgentKindFilter;
  status: AgentStatusFilter;
  sort: AgentSort;
}

export const DEFAULT_AGENT_FILTERS: AgentFilters = {
  query: "",
  kind: "all",
  status: "all",
  sort: "recent",
};

/**
 * Filters and sorts the agent list.
 *
 * Pure and separate from the component so the search/sort rules are unit
 * tested rather than verified by clicking around. Archived agents are hidden
 * unless explicitly asked for — an archived agent is deliberately out of the
 * way, but must still be reachable, which the status filter provides.
 */
export function filterAgents(agents: AgentListItem[], filters: AgentFilters): AgentListItem[] {
  const query = filters.query.trim().toLowerCase();

  const matched = agents.filter((agent) => {
    if (filters.status === "all") {
      if (agent.status === "archived") return false;
    } else if (agent.status !== filters.status) {
      return false;
    }

    if (filters.kind !== "all" && agent.kind !== filters.kind) return false;

    if (query) {
      const haystack = `${agent.name} ${agent.description} ${agent.model ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  return sortAgents(matched, filters.sort);
}

function sortAgents(agents: AgentListItem[], sort: AgentSort): AgentListItem[] {
  const sorted = [...agents];
  switch (sort) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "oldest":
      return sorted.sort((a, b) => time(a.createdAt) - time(b.createdAt));
    case "activity":
      // Agents that have never run sort last rather than being treated as
      // infinitely old, so "most active" surfaces real usage.
      return sorted.sort((a, b) => time(b.lastRunAt) - time(a.lastRunAt));
    case "recent":
    default:
      return sorted.sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
  }
}

function time(iso: string | null): number {
  if (!iso) return 0;
  const value = new Date(iso).getTime();
  return Number.isFinite(value) ? value : 0;
}

/** Counts per status for the filter chips, computed before status filtering is applied. */
export function countByStatus(agents: AgentListItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const agent of agents) {
    counts[agent.status] = (counts[agent.status] ?? 0) + 1;
  }
  return counts;
}
