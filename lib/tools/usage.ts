export interface ToolUsage {
  callCount: number;
  failureCount: number;
  lastUsedAt: string | null;
}

interface TraceRun {
  created_at: string;
  trace: unknown;
}

/**
 * Tallies tool executions out of recorded run traces.
 *
 * The chat routes write a `{ step: "tool", tool_id, status }` entry per call
 * into `agent_runs.trace`, so usage is derived from executions that actually
 * happened rather than a counter that could drift from reality. Runs are
 * expected newest-first; the first trace entry seen for a tool is its last use.
 */
export function summarizeToolUsage(runs: TraceRun[]): Map<string, ToolUsage> {
  const usage = new Map<string, ToolUsage>();

  for (const run of runs) {
    if (!Array.isArray(run.trace)) continue;
    for (const raw of run.trace) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as Record<string, unknown>;
      if (entry.step !== "tool") continue;
      const toolId = typeof entry.tool_id === "string" ? entry.tool_id : null;
      if (!toolId) continue;

      const current = usage.get(toolId) ?? { callCount: 0, failureCount: 0, lastUsedAt: null };
      current.callCount += 1;
      if (entry.status === "failed") current.failureCount += 1;
      // Runs arrive newest-first, so the earliest sighting is the most recent use.
      if (current.lastUsedAt === null) current.lastUsedAt = run.created_at;
      usage.set(toolId, current);
    }
  }

  return usage;
}
