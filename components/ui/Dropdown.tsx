"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

interface MenuPosition {
  top: number;
  left: number;
}

const MENU_WIDTH = 208; // matches min-w below; used to keep the menu on screen
const VIEWPORT_MARGIN = 8;

/**
 * Click-triggered menu.
 *
 * The menu is rendered through a portal into <body> rather than as an
 * absolutely-positioned child of the trigger. That is not incidental: the
 * `.neon-card` surface sets `backdrop-filter`, which creates a stacking
 * context, so a menu nested inside one card was painted *underneath* any card
 * later in the DOM no matter how high its z-index — making every agent card's
 * menu except the last one unclickable. Portalling escapes every ancestor
 * stacking context and clipping container at once.
 *
 * Closes on outside click, Escape, scroll, resize, or item selection, and
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
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Portals need a DOM target, which does not exist during SSR.
  useEffect(() => setMounted(true), []);

  const reposition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const preferredLeft = align === "right" ? rect.right - MENU_WIDTH : rect.left;
    // Keep the menu inside the viewport on narrow screens.
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, preferredLeft),
      window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN
    );
    setPosition({ top: rect.bottom + 6, left });
  }, [align]);

  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    // A menu anchored to a moving trigger would drift, so close instead of
    // trying to track it.
    function onViewportChange() {
      setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onViewportChange, true);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [open]);

  return (
    <div className={clsx("relative", className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v), ref: triggerRef })}
      {open &&
        mounted &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={menuLabel}
            onClick={() => setOpen(false)}
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className="fixed z-[80] rounded-xl border border-base-700 bg-base-900 p-1.5 shadow-popover animate-scale-in"
          >
            {children}
          </div>,
          document.body
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
