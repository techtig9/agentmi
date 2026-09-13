"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Bot, Download, Package, Search, Store, Workflow, X } from "lucide-react";
import {
  installMarketplaceItem,
  publishMarketplaceItem as publishAction,
  unpublishMarketplaceItem,
} from "@/lib/actions/ecosystem";
import { EmptyState } from "@/components/ui/States";
import { StatusBadge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { categoryLabel } from "@/lib/templates/describe";
import { formatRelativeTime } from "@/lib/data/run-metrics";

export interface MarketplaceCard {
  id: string;
  title: string;
  description: string;
  category: string;
  resourceType: string;
  status: string;
  version: number;
  /** Real install count from the database. Never a fabricated popularity figure. */
  installs: number;
  isOwn: boolean;
  createdAt: string;
}

export function MarketplaceBrowser({ items }: { items: MarketplaceCard[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const item of items) seen.set(item.category, (seen.get(item.category) ?? 0) + 1);
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(q);
    });
  }, [items, query, category]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="Nothing published yet"
        description="The marketplace lists agents and workflows people have chosen to share. Publish one of yours from the panel to start it off."
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the marketplace…"
            aria-label="Search marketplace"
            className="w-full rounded-lg border border-base-700 bg-base-900 py-2.5 pl-9 pr-3 text-sm text-ink-100
                       outline-none transition-colors placeholder:text-ink-600
                       focus:border-neon-cyan/60 focus:shadow-neon-cyan"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          <Chip label={`All (${items.length})`} active={category === "all"} onClick={() => setCategory("all")} />
          {categories.map(([id, count]) => (
            <Chip
              key={id}
              label={`${categoryLabel(id)} (${count})`}
              active={category === id}
              onClick={() => setCategory(id)}
            />
          ))}
        </div>
      </div>

      <p className="mb-4 text-xs text-ink-600" role="status" aria-live="polite">
        {visible.length} of {items.length} listings
        {(query || category !== "all") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
            className="ml-2 inline-flex items-center gap-1 text-neon-cyan hover:underline"
          >
            <X size={11} aria-hidden="true" />
            Clear
          </button>
        )}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No listings match"
          description="Try a different search term or clear the filters."
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.id} className="rounded-xl border border-base-700 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-base-700 bg-base-900">
                      {item.resourceType === "workflow" ? (
                        <Workflow size={15} className="text-neon-violet" aria-hidden="true" />
                      ) : (
                        <Bot size={15} className="text-neon-cyan" aria-hidden="true" />
                      )}
                    </span>
                    <p className="truncate font-display font-bold">{item.title}</p>
                    {item.isOwn && <StatusBadge status={item.status} />}
                  </div>
                  <p className="mt-2 text-sm text-ink-400">{item.description}</p>
                  <p className="mt-2 flex flex-wrap gap-x-3 font-mono text-[11px] text-ink-600">
                    <span>{categoryLabel(item.category)}</span>
                    <span>v{item.version}</span>
                    {/*
                      Install count is the real column. There are deliberately no
                      ratings or download figures here — the platform does not
                      collect either, and inventing them would be fiction.
                    */}
                    <span>
                      {item.installs} {item.installs === 1 ? "install" : "installs"}
                    </span>
                    <span>published {formatRelativeTime(item.createdAt)}</span>
                    {item.isOwn && <span className="text-neon-cyan">Yours</span>}
                  </p>
                </div>

                <div className="shrink-0">
                  {item.isOwn && item.status === "published" ? (
                    <form action={unpublishMarketplaceItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton size="sm" variant="secondary" pendingLabel="Unpublishing…">
                        Unpublish
                      </SubmitButton>
                    </form>
                  ) : (
                    <form action={installMarketplaceItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton size="sm" icon={Download} pendingLabel="Installing…">
                        Install
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "rounded-lg border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan"
          : "border-base-700 text-ink-400 hover:border-neon-cyan/40 hover:text-ink-100"
      )}
    >
      {label}
    </button>
  );
}

export function PublishForm({ agents }: { agents: { id: string; name: string }[] }) {
  return (
    <form action={publishAction} className="neon-card space-y-4 p-5">
      <div>
        <h2 className="flex items-center gap-2 font-display font-bold">
          <Package size={16} className="text-neon-cyan" aria-hidden="true" />
          Publish an agent
        </h2>
        <p className="mt-1 text-xs text-ink-600">
          Shares the agent&apos;s configuration so others can start from it.
        </p>
      </div>

      <input type="hidden" name="resource_type" value="agent" />

      <label className="block">
        <span className="mb-1.5 block font-body text-sm text-ink-400">Agent</span>
        <select
          name="resource_id"
          required
          className="w-full rounded-lg border border-base-700 bg-base-900 px-3.5 py-2.5 text-ink-100 outline-none transition-colors focus:border-neon-cyan/60"
        >
          {agents.length === 0 ? (
            <option value="">No agents to publish yet</option>
          ) : (
            agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))
          )}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block font-body text-sm text-ink-400">Listing title</span>
        <input
          name="title"
          required
          placeholder="Refund support assistant"
          className="w-full rounded-lg border border-base-700 bg-base-900 px-3.5 py-2.5 text-ink-100 outline-none transition-colors placeholder:text-ink-600 focus:border-neon-cyan/60"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block font-body text-sm text-ink-400">Category</span>
        <input
          name="category"
          required
          placeholder="customer_support"
          className="w-full rounded-lg border border-base-700 bg-base-900 px-3.5 py-2.5 text-ink-100 outline-none transition-colors placeholder:text-ink-600 focus:border-neon-cyan/60"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block font-body text-sm text-ink-400">Description</span>
        <textarea
          name="description"
          rows={3}
          placeholder="What does it do, and who is it for?"
          className="w-full resize-y rounded-lg border border-base-700 bg-base-900 px-3.5 py-2.5 text-ink-100 outline-none transition-colors placeholder:text-ink-600 focus:border-neon-cyan/60"
        />
      </label>

      <SubmitButton className="w-full" disabled={agents.length === 0} pendingLabel="Publishing…">
        Publish publicly
      </SubmitButton>

      <p className="text-[11px] text-ink-600">
        Secrets, private knowledge, API keys and memory are never copied into a listing.
      </p>
    </form>
  );
}
