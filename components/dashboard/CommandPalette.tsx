"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CornerDownLeft, Search, ShieldCheck } from "lucide-react";
import { NAV_GROUPS } from "./Sidebar";
import { useFocusTrap, useScrollLock } from "@/components/ui/useFocusTrap";
import { filterCommands, type Command } from "@/lib/navigation/commands";

/**
 * ⌘K / Ctrl+K navigator over every dashboard route.
 *
 * Deliberately navigation-only: it moves you to a page, it does not execute
 * actions. Searching real records (agents, runs) needs server queries and
 * belongs with the global search work in a later phase — shipping a palette
 * that pretends to search data it never queried would be exactly the kind of
 * fake functionality this codebase has so far avoided.
 */
export function CommandPalette({
  open,
  onOpenChange,
  isAdmin,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useFocusTrap(panelRef, open, () => onOpenChange(false));
  useScrollLock(open);

  const commands = useMemo<Command[]>(() => {
    const routes = NAV_GROUPS.flatMap((group) =>
      group.items.map(([href, label]) => ({ href, label, group: group.label }))
    );
    if (isAdmin) routes.push({ href: "/admin", label: "Admin Panel", group: "ADMIN" });
    return routes;
  }, [isAdmin]);

  const results = useMemo(() => filterCommands(commands, query), [commands, query]);

  // Reset transient state whenever the palette opens, so it never reopens
  // showing the previous session's query or a stale highlight.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the highlighted row in view during keyboard navigation.
  useEffect(() => {
    listRef.current
      ?.querySelectorAll("li")
      [activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex];
      if (target) go(target.href);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[10vh]">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-xl overflow-hidden rounded-card border border-base-700 bg-base-900 shadow-popover animate-scale-in"
      >
        <div className="flex items-center gap-3 border-b border-base-700 px-4">
          <Search size={16} className="shrink-0 text-ink-600" aria-hidden="true" />
          <input
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={results[activeIndex] ? `command-${activeIndex}` : undefined}
            aria-label="Search pages"
            autoComplete="off"
            placeholder="Search pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-transparent py-4 text-sm text-ink-100 outline-none placeholder:text-ink-600"
          />
          <kbd className="hidden shrink-0 rounded border border-base-700 px-1.5 py-0.5 font-mono text-[10px] text-ink-600 sm:block">
            ESC
          </kbd>
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-ink-600">
            No pages match “{query}”.
          </p>
        ) : (
          <ul id="command-results" ref={listRef} role="listbox" aria-label="Pages" className="max-h-80 overflow-y-auto p-2">
            {results.map((command, index) => (
              <li key={command.href} id={`command-${index}`} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  onClick={() => go(command.href)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={clsx(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-150",
                    index === activeIndex ? "bg-base-800 text-ink-100" : "text-ink-400"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {command.group === "ADMIN" && (
                      <ShieldCheck size={14} className="shrink-0 text-neon-violet" aria-hidden="true" />
                    )}
                    <span className="truncate">{command.label}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-[10px] tracking-[0.14em] text-ink-600">
                      {command.group}
                    </span>
                    {index === activeIndex && (
                      <CornerDownLeft size={12} className="text-ink-600" aria-hidden="true" />
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Registers the global ⌘K / Ctrl+K shortcut. Returns nothing; state lives in the shell. */
export function useCommandPaletteShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}
