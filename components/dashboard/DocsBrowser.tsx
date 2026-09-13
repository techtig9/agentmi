"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, BookOpen, Search, X } from "lucide-react";
import { searchDocs, type DocSection } from "@/lib/docs/content";
import { EmptyState } from "@/components/ui/States";

export function DocsBrowser({ sections }: { sections: DocSection[] }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchDocs(sections, query), [sections, query]);

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Documentation sections" className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-600">
          Contents
        </p>
        <ul className="space-y-0.5">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={clsx(
                  "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                  results.some((r) => r.id === section.id)
                    ? "text-ink-400 hover:bg-base-800 hover:text-ink-100"
                    : "text-ink-600 opacity-50"
                )}
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0">
        <div className="relative mb-6">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-600"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the documentation…"
            aria-label="Search documentation"
            className="w-full rounded-lg border border-base-700 bg-base-900 py-2.5 pl-9 pr-3 text-sm text-ink-100
                       outline-none transition-colors placeholder:text-ink-600
                       focus:border-neon-cyan/60 focus:shadow-neon-cyan"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-600 transition-colors hover:text-ink-100"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {query && (
          <p className="mb-4 text-xs text-ink-600" role="status" aria-live="polite">
            {results.length} of {sections.length} sections match “{query}”.
          </p>
        )}

        {results.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nothing matches that"
            description="Try a broader term, or clear the search to browse every section."
          />
        ) : (
          <div className="space-y-6">
            {results.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-heading`}
                className="neon-card scroll-mt-24 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id={`${section.id}-heading`} className="text-lg font-bold">
                      {section.title}
                    </h2>
                    <p className="mt-1 text-sm text-ink-400">{section.summary}</p>
                  </div>
                  <Link
                    href={section.href}
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-neon-cyan hover:underline"
                  >
                    Open in workspace
                    <ArrowRight size={12} aria-hidden="true" />
                  </Link>
                </div>

                <ul className="mt-4 space-y-2.5">
                  {section.points.map((point, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-ink-400">
                      <span
                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neon-cyan"
                        aria-hidden="true"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
