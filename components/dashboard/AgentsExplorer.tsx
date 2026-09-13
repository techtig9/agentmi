"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  Archive,
  ArchiveRestore,
  Bot,
  BookOpen,
  Copy,
  Database,
  LayoutGrid,
  List,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Rocket,
  Search,
  Wrench,
  X,
} from "lucide-react";
import {
  filterAgents,
  DEFAULT_AGENT_FILTERS,
  type AgentFilters,
  type AgentListItem,
  type AgentKindFilter,
  type AgentSort,
  type AgentStatusFilter,
} from "@/lib/agents/filter";
import { formatRelativeTime } from "@/lib/data/run-metrics";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/Dropdown";
import { AgentActionForm } from "./AgentActionForm";

const KIND_OPTIONS: ReadonlyArray<readonly [AgentKindFilter, string]> = [
  ["all", "All types"],
  ["ai", "AI agents"],
  ["ml", "ML agents"],
];

const STATUS_OPTIONS: ReadonlyArray<readonly [AgentStatusFilter, string]> = [
  ["all", "Active"],
  ["ready", "Ready"],
  ["draft", "Draft"],
  ["training", "Training"],
  ["failed", "Failed"],
  ["archived", "Archived"],
];

const SORT_OPTIONS: ReadonlyArray<readonly [AgentSort, string]> = [
  ["recent", "Recently updated"],
  ["activity", "Most recently run"],
  ["name", "Name (A–Z)"],
  ["oldest", "Oldest first"],
];

export function AgentsExplorer({ agents, canArchive }: { agents: AgentListItem[]; canArchive: boolean }) {
  const [filters, setFilters] = useState<AgentFilters>(DEFAULT_AGENT_FILTERS);
  const [view, setView] = useState<"grid" | "list">("grid");

  const visible = useMemo(() => filterAgents(agents, filters), [agents, filters]);
  const isFiltered =
    filters.query.trim() !== "" || filters.kind !== "all" || filters.status !== "all";

  function update(patch: Partial<AgentFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  if (agents.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title="No agents yet"
        description="Describe what you need and Agentmi will configure a working agent — knowledge, tools and all."
        action={
          <Link href="/dashboard/create" className="btn-primary">
            <Plus size={16} aria-hidden="true" />
            Create your first agent
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Search agents by name, description or model…"
            aria-label="Search agents"
            className="w-full rounded-lg border border-base-700 bg-base-900 py-2.5 pl-9 pr-3 text-sm text-ink-100
                       outline-none transition-colors placeholder:text-ink-600
                       focus:border-neon-cyan/60 focus:shadow-neon-cyan"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Type"
            value={filters.kind}
            options={KIND_OPTIONS}
            onChange={(value) => update({ kind: value as AgentKindFilter })}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            options={STATUS_OPTIONS}
            onChange={(value) => update({ status: value as AgentStatusFilter })}
          />
          <FilterSelect
            label="Sort"
            value={filters.sort}
            options={SORT_OPTIONS}
            onChange={(value) => update({ sort: value as AgentSort })}
          />

          <div className="flex rounded-lg border border-base-700 p-0.5" role="group" aria-label="View mode">
            <ViewToggle icon={LayoutGrid} label="Grid view" active={view === "grid"} onClick={() => setView("grid")} />
            <ViewToggle icon={List} label="List view" active={view === "list"} onClick={() => setView("list")} />
          </div>
        </div>
      </div>

      <p className="mb-4 text-xs text-ink-600" role="status" aria-live="polite">
        {visible.length} of {agents.length} agents
        {isFiltered && (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_AGENT_FILTERS)}
            className="ml-2 inline-flex items-center gap-1 text-neon-cyan hover:underline"
          >
            <X size={11} aria-hidden="true" />
            Clear filters
          </button>
        )}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No agents match those filters"
          description="Try a different search term, or clear the filters to see everything in this workspace."
        />
      ) : view === "grid" ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((agent) => (
            <li key={agent.id} className="min-w-0">
              <AgentCard agent={agent} canArchive={canArchive} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-base-700 rounded-card border border-base-700">
          {visible.map((agent) => (
            <li key={agent.id} className="min-w-0">
              <AgentRow agent={agent} canArchive={canArchive} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AgentCard({ agent, canArchive }: { agent: AgentListItem; canArchive: boolean }) {
  return (
    <div className="neon-card flex h-full min-w-0 flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/dashboard/agents/${agent.id}`} className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-base-700 bg-base-900">
            {agent.kind === "ml" ? (
              <Database size={16} className="text-neon-violet" aria-hidden="true" />
            ) : (
              <Bot size={16} className="text-neon-cyan" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display font-bold text-ink-100">{agent.name}</span>
            <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wider text-ink-600">
              {agent.kind} agent
            </span>
          </span>
        </Link>
        <AgentMenu agent={agent} canArchive={canArchive} />
      </div>

      <p className="mt-3.5 line-clamp-2 min-h-[2.5rem] text-sm text-ink-400">
        {agent.description || "No description yet."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-600">
        <span className="inline-flex items-center gap-1.5" title="Knowledge sources attached">
          <BookOpen size={12} aria-hidden="true" />
          {agent.knowledgeSources === 0
            ? "No knowledge"
            : `${agent.knowledgeSources} source${agent.knowledgeSources === 1 ? "" : "s"}`}
        </span>
        <span className="inline-flex items-center gap-1.5" title="Tools available to this agent">
          <Wrench size={12} aria-hidden="true" />
          {agent.toolCount} {agent.toolCount === 1 ? "tool" : "tools"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-base-700 pt-4">
        <StatusBadge status={agent.status} />
        <span className="truncate font-mono text-[11px] text-ink-600">
          {agent.lastRunAt ? `Ran ${formatRelativeTime(agent.lastRunAt)}` : "Never run"}
        </span>
      </div>

      <p className="mt-2 truncate font-mono text-[11px] text-ink-600" title={agent.model ?? undefined}>
        {agent.model ?? "Default model"}
      </p>
    </div>
  );
}

function AgentRow({ agent, canArchive }: { agent: AgentListItem; canArchive: boolean }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-base-800/40">
      <Link href={`/dashboard/agents/${agent.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-base-700 bg-base-900">
          {agent.kind === "ml" ? (
            <Database size={15} className="text-neon-violet" aria-hidden="true" />
          ) : (
            <Bot size={15} className="text-neon-cyan" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink-100">{agent.name}</span>
          <span className="mt-0.5 block truncate text-xs text-ink-600">
            {agent.description || "No description yet."}
          </span>
        </span>
      </Link>

      <span className="hidden shrink-0 font-mono text-[11px] text-ink-600 lg:block">
        {agent.knowledgeSources} src · {agent.toolCount} tools
      </span>
      <span className="hidden shrink-0 font-mono text-[11px] text-ink-600 sm:block">
        {agent.lastRunAt ? formatRelativeTime(agent.lastRunAt) : "Never run"}
      </span>
      <StatusBadge status={agent.status} className="shrink-0" />
      <AgentMenu agent={agent} canArchive={canArchive} />
    </div>
  );
}

function AgentMenu({ agent, canArchive }: { agent: AgentListItem; canArchive: boolean }) {
  const isArchived = agent.status === "archived";

  return (
    <Dropdown
      menuLabel={`Actions for ${agent.name}`}
      trigger={({ open, toggle, ref }) => (
        <button
          ref={ref}
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Actions for ${agent.name}`}
          className="shrink-0 rounded-lg p-1.5 text-ink-600 transition-colors hover:bg-base-800 hover:text-ink-100"
        >
          <MoreHorizontal size={16} aria-hidden="true" />
        </button>
      )}
    >
      <Link href={`/dashboard/agents/${agent.id}`} className="block">
        <DropdownItem icon={Bot}>Open</DropdownItem>
      </Link>
      {agent.kind === "ai" && agent.status === "ready" && (
        <Link href={`/dashboard/agents/${agent.id}/test`} className="block">
          <DropdownItem icon={Play}>Test</DropdownItem>
        </Link>
      )}
      <Link href={`/dashboard/agents/${agent.id}/builder`} className="block">
        <DropdownItem icon={Pencil}>Edit</DropdownItem>
      </Link>
      <Link href="/dashboard/deployments" className="block">
        <DropdownItem icon={Rocket}>Deploy</DropdownItem>
      </Link>

      {agent.kind === "ai" && (
        <>
          <DropdownSeparator />
          <AgentActionForm
            action="duplicate"
            agentId={agent.id}
            icon={Copy}
            label="Duplicate"
            confirmTitle="Duplicate this agent?"
            confirmDescription={`A copy of "${agent.name}" will be created with the same configuration. Knowledge, memories and run history are not copied, and duplicating costs credits.`}
            confirmLabel="Duplicate"
            destructive={false}
          />
        </>
      )}

      {canArchive && (
        <>
          <DropdownSeparator />
          {isArchived ? (
            <AgentActionForm
              action="restore"
              agentId={agent.id}
              icon={ArchiveRestore}
              label="Restore"
              confirmTitle="Restore this agent?"
              confirmDescription={`"${agent.name}" will become available again in this workspace.`}
              confirmLabel="Restore"
              destructive={false}
            />
          ) : (
            <AgentActionForm
              action="archive"
              agentId={agent.id}
              icon={Archive}
              label="Archive"
              confirmTitle="Archive this agent?"
              confirmDescription={`"${agent.name}" will be hidden from the active list. Its runs, knowledge and deployments are kept, and you can restore it at any time.`}
              confirmLabel="Archive"
              destructive
            />
          )}
        </>
      )}
    </Dropdown>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-ink-400
                   outline-none transition-colors focus:border-neon-cyan/60"
      >
        {options.map(([id, optionLabel]) => (
          <option key={id} value={id}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function ViewToggle({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof LayoutGrid;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={clsx(
        "rounded-md p-1.5 transition-colors",
        active ? "bg-base-800 text-neon-cyan" : "text-ink-600 hover:text-ink-100"
      )}
    >
      <Icon size={15} aria-hidden="true" />
    </button>
  );
}
