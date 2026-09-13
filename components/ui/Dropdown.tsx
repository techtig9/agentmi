"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

/**
 * Click-triggered menu. Closes on outside click, Escape, or item selection, and
 * returns focus to the trigger so keyboard users are not dumped at the top of
 * the document.
 */
export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
  menuLabel = "Menu",
}: {
  trigger: (props: { open: boolean; toggle: () => void; ref: React.Ref<HTMLButtonElement> }) => ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  menuLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v), ref: triggerRef })}
      {open && (
        <div
          role="menu"
          aria-label={menuLabel}
          onClick={() => setOpen(false)}
          className={clsx(
            "absolute z-40 mt-2 min-w-[13rem] rounded-xl border border-base-700 bg-base-900 p-1.5 shadow-popover animate-scale-in",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  icon: Icon,
  children,
  onClick,
  destructive = false,
}: {
  icon?: LucideIcon;
  children: ReactNode;
  onClick?: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150",
        destructive
          ? "text-neon-pink hover:bg-neon-pink/10"
          : "text-ink-400 hover:bg-base-800 hover:text-ink-100"
      )}
    >
      {Icon && <Icon size={15} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div role="separator" className="my-1.5 h-px bg-base-700" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-600">
      {children}
    </p>
  );
}
