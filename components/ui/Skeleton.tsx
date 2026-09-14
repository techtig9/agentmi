import clsx from "clsx";

/**
 * Loading placeholder. Marked `aria-hidden` with the live region left to the
 * caller — a screen reader should hear "loading", not a description of grey
 * rectangles. The shimmer stops under prefers-reduced-motion (see globals.css).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx("skeleton-shimmer rounded-lg bg-base-800", className)}
    />
  );
}

/** Skeleton shaped like a `MetricCard`, for dashboard/stat grids. */
export function SkeletonMetric() {
  return (
    <div className="rounded-card border border-base-700 bg-base-800/80 p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-28" />
    </div>
  );
}

/** Skeleton shaped like a list row, for tables and record lists. */
export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-48 max-w-full" />
        <Skeleton className="mt-2 h-3 w-24" />
      </div>
      <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
    </div>
  );
}

/**
 * Full-surface loading state. Wrap in this rather than returning `null` from a
 * Suspense boundary so layout does not jump when content arrives.
 */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="divide-y divide-base-700">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
