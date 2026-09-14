"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Bot, Database, Eye, LayoutTemplate, Search, X } from "lucide-react";
import { EmptyState } from "@/components/ui/States";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { categoryLabel, type TemplateRequirement } from "@/lib/templates/describe";

export interface TemplateCard {
  id: string;
  name: string;
  description: string;
  kind: string;
  category: string;
  requirements: TemplateRequirement[];
  prompt: string | null;
}

/**
 * Template gallery.
 *
 * Categories are built from the templates that actually exist rather than a
 * fixed list — advertising eight categories when the workspace has seeded three
 * would mean five filters that always come back empty.
 */
export function TemplateGallery({ templates }: { templates: TemplateCard[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [preview, setPreview] = useState<TemplateCard | null>(null);

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const template of templates) {
      seen.set(template.category, (seen.get(template.category) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [templates]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((template) => {
      if (category !== "all" && template.category !== category) return false;
      if (!q) return true;
      return `${template.name} ${template.description} ${template.category}`.toLowerCase().includes(q);
    });
  }, [templates, query, category]);

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={LayoutTemplate}
        title="No templates available"
        description="Templates are seeded into the database. Once they are, they will appear here as starting points for new agents."
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            aria-label="Search templates"
            className="w-full rounded-lg border border-base-700 bg-base-900 py-2.5 pl-9 pr-3 text-sm text-ink-100
                       outline-none transition-colors placeholder:text-ink-600
                       focus:border-neon-cyan/60 focus:shadow-neon-cyan"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          <CategoryChip
            label={`All (${templates.length})`}
            active={category === "all"}
            onClick={() => setCategory("all")}
          />
          {categories.map(([id, count]) => (
            <CategoryChip
              key={id}
              label={`${categoryLabel(id)} (${count})`}
              active={category === id}
              onClick={() => setCategory(id)}
            />
          ))}
        </div>
      </div>

      <p className="mb-4 text-xs text-ink-600" role="status" aria-live="polite">
        {visible.length} of {templates.length} templates
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
          title="No templates match"
          description="Try a different search term, or clear the filters to see everything available."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((template) => (
            <li key={template.id} className="min-w-0">
              <div className="neon-card flex h-full min-w-0 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-base-700 bg-base-900">
                    {template.kind === "ml" ? (
                      <Database size={16} className="text-neon-violet" aria-hidden="true" />
                    ) : (
                      <Bot size={16} className="text-neon-cyan" aria-hidden="true" />
                    )}
                  </span>
                  <span className="rounded-full border border-base-700 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-600">
                    {categoryLabel(template.category)}
                  </span>
                </div>

                <h3 className="mt-3.5 font-display font-bold">{template.name}</h3>
                <p className="mt-1.5 flex-1 text-sm text-ink-400">{template.description}</p>

                <ul className="mt-4 space-y-1.5">
                  {template.requirements.map((requirement) => (
                    <li key={requirement.label} className="flex gap-2 text-xs">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neon-cyan" aria-hidden="true" />
                      <span>
                        <span className="text-ink-100">{requirement.label}.</span>{" "}
                        <span className="text-ink-600">{requirement.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex items-center gap-2 border-t border-base-700 pt-4">
                  <Link
                    href={`/dashboard/create?template=${template.id}`}
                    className="btn-primary flex-1 !px-3 !py-2 text-xs"
                  >
                    Create from template
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                  {template.prompt && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={Eye}
                      onClick={() => setPreview(template)}
                      aria-label={`Preview ${template.name} instructions`}
                    >
                      Preview
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.name ?? ""}
        description="The instructions your agent starts from. You can edit every word of this in the builder afterwards."
        size="lg"
        footer={
          preview && (
            <Link href={`/dashboard/create?template=${preview.id}`} className="btn-primary">
              Create from template
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )
        }
      >
        {preview?.prompt && (
          <pre
            tabIndex={0}
            className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-base-700 bg-base-900 p-3.5 font-mono text-xs text-ink-400"
          >
            {preview.prompt}
          </pre>
        )}
        <p className="mt-3 text-xs text-ink-600">
          {"{{company_name}}"} is replaced with your workspace name at run time.
        </p>
      </Modal>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
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
