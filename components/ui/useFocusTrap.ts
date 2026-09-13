"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Traps Tab/Shift+Tab inside `ref` while `active`, closes on Escape, moves
 * focus in on open and restores it to the previously focused element on close.
 *
 * This is the behaviour that separates a real dialog from a div that looks like
 * one: without it, keyboard users tab straight out of an open modal into the
 * page behind it and cannot get back.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first control inside, falling back to the container itself.
    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    const initial = focusables()[0] ?? container;
    initial.focus();

    // Arrow function, not a hoisted `function` declaration: TypeScript does not
    // carry the `if (!container) return` narrowing into a hoisted declaration.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || !container.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // Only restore focus if it is still somewhere inside the closing surface,
      // so we do not steal focus the user has deliberately moved elsewhere.
      if (previouslyFocused && container.contains(document.activeElement)) {
        previouslyFocused.focus();
      }
    };
  }, [ref, active, onClose]);
}

/** Locks background scroll while an overlay is open. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
