import test from "node:test";
import assert from "node:assert/strict";
import {
  summarizeRuns,
  percentile,
  formatDuration,
  formatRelativeTime,
  type RunRow,
} from "../lib/data/run-metrics";

function run(status: string, duration_ms: number | null, created_at = "2026-01-01T00:00:00Z"): RunRow {
  return { status, duration_ms, created_at };
}

test("an empty run list reports no rate rather than 0% or 100%", () => {
  const summary = summarizeRuns([]);
  assert.equal(summary.total, 0);
  assert.equal(summary.successRate, null, "no runs must not read as a 0% success rate");
  assert.equal(summary.averageLatencyMs, null);
  assert.equal(summary.p95LatencyMs, null);
});

test("success rate counts only terminal runs, so in-flight runs are not failures", () => {
  const summary = summarizeRuns([
    run("succeeded", 100),
    run("succeeded", 200),
    run("failed", 150),
    run("running", null),
  ]);
  assert.equal(summary.total, 4, "every run counts toward the total");
  assert.equal(summary.succeeded, 2);
  assert.equal(summary.failed, 1);
  // 2 of 3 terminal runs, not 2 of 4.
  assert.equal(summary.successRate, 67);
});

test("runs with no recorded duration are excluded from latency, not counted as zero", () => {
  const summary = summarizeRuns([run("succeeded", 400), run("succeeded", null), run("failed", 600)]);
  assert.equal(summary.averageLatencyMs, 500, "null durations must not drag the mean toward zero");
});

test("negative and non-finite durations are rejected", () => {
  const summary = summarizeRuns([
    run("succeeded", 100),
    run("succeeded", -5),
    run("succeeded", Number.NaN),
  ]);
  assert.equal(summary.averageLatencyMs, 100);
});

test("p95 uses nearest rank and never reads past the end of the array", () => {
  assert.equal(percentile([], 95), null);
  assert.equal(percentile([42], 95), 42);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95), 10);
  assert.equal(percentile([1, 2, 3, 4], 50), 2);
});

test("durations are formatted at a readable scale", () => {
  assert.equal(formatDuration(null), "—");
  assert.equal(formatDuration(0), "0 ms");
  assert.equal(formatDuration(842), "842 ms");
  assert.equal(formatDuration(1400), "1.4 s");
  assert.equal(formatDuration(125_000), "2 m 05 s");
});

test("relative time degrades from seconds to a date", () => {
  const now = new Date("2026-01-10T12:00:00Z");
  assert.equal(formatRelativeTime("2026-01-10T11:59:30Z", now), "just now");
  assert.equal(formatRelativeTime("2026-01-10T11:30:00Z", now), "30m ago");
  assert.equal(formatRelativeTime("2026-01-10T06:00:00Z", now), "6h ago");
  assert.equal(formatRelativeTime("2026-01-07T12:00:00Z", now), "3d ago");
  // Past a week it becomes an absolute date rather than "45d ago".
  assert.ok(!formatRelativeTime("2025-11-01T12:00:00Z", now).includes("ago"));
});
