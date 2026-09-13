import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * Table primitives.
 *
 * `Table` always wraps itself in an `overflow-x-auto` scroller with
 * `tabindex=0`, because a wide data table is the single most common source of
 * horizontal page overflow on mobile — and a scrollable region that cannot be
 * reached by keyboard is its own accessibility failure.
 */
export function Table({
  children,
  caption,
  className,
}: {
  children: ReactNode;
  /** Visually hidden by default — screen readers announce it as the table's purpose. */
  caption: string;
  className?: string;
}) {
  return (
    <div
      className="w-full overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className={clsx("w-full min-w-[36rem] border-collapse text-sm", className)}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="border-b border-base-700">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-base-700">{children}</tbody>;
}

export function TR({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={clsx("transition-colors duration-150 hover:bg-base-800/40", className)}>{children}</tr>;
}

export function TH({
  children,
  className,
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  return (
    <th
      scope="col"
      className={clsx(
        "whitespace-nowrap px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-600",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className
      )}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  className,
  align = "left",
  /** Renders IDs, timestamps and other technical values in the mono face. */
  mono = false,
}: {
  children: ReactNode;
  className?: string;
  align?: "left" | "right" | "center";
  mono?: boolean;
}) {
  return (
    <td
      className={clsx(
        "px-3 py-3 text-ink-400",
        mono && "font-mono text-xs",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      {children}
    </td>
  );
}
