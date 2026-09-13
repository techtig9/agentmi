/**
 * Aggregations over `agent_runs`, the table every chat-capable route already
 * writes to via `recordAgentRun`.
 *
 * Pure functions over rows the caller fetched, so the maths is unit-testable
 * and there is no second source of truth for "success rate" between the
 * dashboard, observability and analytics screens.
 */

export interface RunRow {
  status: string;
  duration_ms: number | null;
  created_at: string;
}

export interface RunSummary {
  total: number;
  succeeded: number;
  failed: number;
  /** Percentage 0-100, rounded. `null` when there are no terminal runs to rate. */
  successRate: number | null;
  /** Mean duration in ms over runs that recorded one. `null` when none did. */
  averageLatencyMs: number | null;
  /** 95th percentile duration in ms, nearest-rank. `null` when none recorded. */
  p95LatencyMs: number | null;
}

/**
 * A run still `running` has no outcome yet, so it counts toward `total` but is
 * excluded from the success-rate denominator — otherwise an in-flight run would
 * read as a failure and make a healthy workspace look broken.
 */
export function summarizeRuns(rows: RunRow[]): RunSummary {
  const total = rows.length;
  const succeeded = rows.filter((r) => r.status === "succeeded").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const terminal = succeeded + failed;

  const durations = rows
    .map((r) => r.duration_ms)
    .filter((d): d is number => typeof d === "number" && Number.isFinite(d) && d >= 0)
    .sort((a, b) => a - b);

  return {
    total,
    succeeded,
    failed,
    successRate: terminal > 0 ? Math.round((succeeded / terminal) * 100) : null,
    averageLatencyMs: durations.length
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : null,
    p95LatencyMs: percentile(durations, 95),
  };
}

/** Nearest-rank percentile over an already-sorted ascending array. */
export function percentile(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  const rank = Math.ceil((p / 100) * sortedAsc.length);
  const index = Math.min(sortedAsc.length - 1, Math.max(0, rank - 1));
  return Math.round(sortedAsc[index]);
}

/** "842 ms" / "1.4 s" / "2 m 05 s" — latency read at a glance, not in raw milliseconds. */
export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} m ${String(seconds).padStart(2, "0")} s`;
}

/** Compact relative time for activity feeds. Falls back to a date past a week. */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (!Number.isFinite(seconds)) return "—";
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
