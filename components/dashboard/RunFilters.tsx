"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { RANGE_OPTIONS } from "@/lib/data/run-metrics";

const STATUS_OPTIONS = [
  ["", "All statuses"],
  ["succeeded", "Succeeded"],
  ["failed", "Failed"],
  ["running", "Running"],
] as const;

/**
 * Run filters, held in the URL rather than component state so a filtered view
 * can be linked, bookmarked and reloaded — and so the server query, which is
 * what paginates, sees the same filters the user chose.
 */
export function RunFilters({
  agents,
  selected,
}: {
  agents: { id: string; name: string }[];
  selected: { agent: string; status: string; range: string };
}) {
  const router = useRouter();
  const params = useSearchParams();

  function apply(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    // Any filter change invalidates the current page number.
    next.delete("page");
    router.push(`/dashboard/runs?${next.toString()}`);
  }

  const isFiltered = Boolean(selected.agent || selected.status);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2">
        <span className="sr-only">Agent</span>
        <select
          aria-label="Filter by agent"
          value={selected.agent}
          onChange={(e) => apply("agent", e.target.value)}
          className="rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-ink-400 outline-none transition-colors focus:border-neon-cyan/60"
        >
          <option value="">All agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </label>

      <label className="inline-flex items-center gap-2">
        <span className="sr-only">Status</span>
        <select
          aria-label="Filter by status"
          value={selected.status}
          onChange={(e) => apply("status", e.target.value)}
          className="rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-ink-400 outline-none transition-colors focus:border-neon-cyan/60"
        >
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="inline-flex items-center gap-2">
        <span className="sr-only">Date range</span>
        <select
          aria-label="Filter by date range"
          value={selected.range}
          onChange={(e) => apply("range", e.target.value)}
          className="rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-ink-400 outline-none transition-colors focus:border-neon-cyan/60"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              Last {option.label}
            </option>
          ))}
        </select>
      </label>

      {isFiltered && (
        <button
          type="button"
          onClick={() => router.push("/dashboard/runs")}
          className="inline-flex items-center gap-1 text-xs text-neon-cyan hover:underline"
        >
          <X size={11} aria-hidden="true" />
          Clear filters
        </button>
      )}
    </div>
  );
}
