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

// ---------------------------------------------------------------------------
// Time ranges and series
// ---------------------------------------------------------------------------

export type RangeId = "24h" | "7d" | "30d" | "90d";

export const RANGE_OPTIONS: ReadonlyArray<{ id: RangeId; label: string; hours: number }> = [
  { id: "24h", label: "24 hours", hours: 24 },
  { id: "7d", label: "7 days", hours: 24 * 7 },
  { id: "30d", label: "30 days", hours: 24 * 30 },
  { id: "90d", label: "90 days", hours: 24 * 90 },
];

export function rangeOption(id: string | undefined): { id: RangeId; label: string; hours: number } {
  return RANGE_OPTIONS.find((option) => option.id === id) ?? RANGE_OPTIONS[2];
}

/** ISO timestamp marking the start of the range, for the database query. */
export function rangeStart(id: string | undefined, now: Date = new Date()): string {
  return new Date(now.getTime() - rangeOption(id).hours * 3_600_000).toISOString();
}

export interface SeriesPoint {
  /** Bucket start, ISO. */
  t: string;
  label: string;
  succeeded: number;
  failed: number;
  total: number;
}

/**
 * Buckets runs into an evenly spaced series.
 *
 * Empty buckets are emitted as zeroes rather than skipped: a gap in a time
 * series must read as "nothing happened", not as a shorter axis that quietly
 * rescales and makes a quiet period look busy.
 */
export function bucketRuns(
  rows: RunRow[],
  range: RangeId,
  now: Date = new Date()
): SeriesPoint[] {
  const { hours } = rangeOption(range);
  const bucketCount = range === "24h" ? 24 : range === "7d" ? 7 : range === "30d" ? 30 : 45;
  const bucketMs = (hours * 3_600_000) / bucketCount;
  const start = now.getTime() - hours * 3_600_000;

  const buckets: SeriesPoint[] = Array.from({ length: bucketCount }, (_, i) => {
    const t = new Date(start + i * bucketMs);
    return {
      t: t.toISOString(),
      label:
        range === "24h"
          ? t.toLocaleTimeString(undefined, { hour: "numeric" })
          : t.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      succeeded: 0,
      failed: 0,
      total: 0,
    };
  });

  for (const row of rows) {
    const time = new Date(row.created_at).getTime();
    if (!Number.isFinite(time)) continue;
    const index = Math.floor((time - start) / bucketMs);
    if (index < 0 || index >= bucketCount) continue;
    buckets[index].total += 1;
    if (row.status === "succeeded") buckets[index].succeeded += 1;
    else if (row.status === "failed") buckets[index].failed += 1;
  }

  return buckets;
}

export interface UsageSlice {
  label: string;
  count: number;
}

/**
 * Counts which model provider served each run, read from the trace the chat
 * routes already write (`{ step: "model", provider, model }`).
 *
 * Returns an empty list when no run recorded a provider — an honest "no data"
 * rather than a fabricated split.
 */
export function providerUsage(runs: Array<{ trace: unknown }>): UsageSlice[] {
  const counts = new Map<string, number>();

  for (const run of runs) {
    if (!Array.isArray(run.trace)) continue;
    for (const raw of run.trace) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as Record<string, unknown>;
      if (entry.step !== "model") continue;
      const provider = typeof entry.provider === "string" ? entry.provider : null;
      if (!provider) continue;
      counts.set(provider, (counts.get(provider) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/** Percentage of terminal runs that failed. `null` when nothing has completed. */
export function errorRate(summary: RunSummary): number | null {
  const terminal = summary.succeeded + summary.failed;
  if (terminal === 0) return null;
  return Math.round((summary.failed / terminal) * 100);
}
