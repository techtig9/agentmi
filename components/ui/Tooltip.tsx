"use client";

import { useId, useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * CSS/state tooltip shown on hover *and* focus, so it is reachable by keyboard.
 *
 * Deliberately not a replacement for an accessible name: icon-only controls
 * still need their own `aria-label` (see `IconButton`). This adds supplementary
 * context only, which is why the bubble is `aria-hidden` and the label is
 * duplicated into `aria-describedby`.
 */
export function Tooltip({
  label,
  side = "right",
  children,
  className,
}: {
  label: string;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactNode;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  const position = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
  }[side];

  return (
    <span
      className={clsx("relative inline-flex", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined} className="inline-flex">
        {children}
      </span>
      {visible && (
        <span
          id={id}
          role="tooltip"
          className={clsx(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-base-700",
            "bg-base-900 px-2.5 py-1.5 text-xs text-ink-100 shadow-popover animate-fade-in",
            position
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
