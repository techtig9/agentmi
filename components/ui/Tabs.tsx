"use client";

import { useRef, type ReactNode } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Optional count/indicator rendered after the label. */
  badge?: ReactNode;
}

/**
 * Tab strip implementing the WAI-ARIA tabs pattern: roving tabindex plus
 * arrow/Home/End key navigation, which is what distinguishes real tabs from a
 * row of buttons.
 *
 * Panels are rendered by the caller; wire them with `id`/`aria-labelledby`
 * using the same ids passed here.
 */
export function Tabs({
  items,
  value,
  onChange,
  className,
  label = "Sections",
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  label?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: React.KeyboardEvent) {
    const index = items.findIndex((item) => item.id === value);
    if (index === -1) return;

    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;

    event.preventDefault();
    onChange(items[next].id);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={clsx("flex gap-1 overflow-x-auto border-b border-base-700", className)}
    >
      {items.map((item) => {
        const selected = item.id === value;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            role="tab"
            id={`tab-${item.id}`}
            type="button"
            aria-selected={selected}
            aria-controls={`panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={clsx(
              "inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm transition-colors duration-200",
              selected
                ? "border-neon-cyan text-neon-cyan"
                : "border-transparent text-ink-400 hover:text-ink-100"
            )}
          >
            {Icon && <Icon size={15} aria-hidden="true" />}
            {item.label}
            {item.badge != null && (
              <span className="rounded-full bg-base-800 px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Panel counterpart to `Tabs`. Hidden panels are unmounted by the caller or kept with `hidden`. */
export function TabPanel({
  id,
  active,
  children,
  className,
}: {
  id: string;
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      hidden={!active}
      tabIndex={0}
      className={className}
    >
      {active && children}
    </div>
  );
}
