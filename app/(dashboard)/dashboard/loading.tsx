import { SkeletonMetric, Skeleton } from "@/components/ui/Skeleton";

/**
 * Dashboard loading state.
 *
 * Every page under /dashboard is an async server component, so without this
 * Next renders nothing at all until the data resolves — a blank panel that
 * reads as a broken page rather than a loading one. The shell (sidebar and
 * topbar) stays up because it lives in the layout above this boundary.
 */
export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="mb-7">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonMetric key={i} />
        ))}
      </div>

      <div className="rounded-card border border-base-700 bg-base-800/80 p-5">
        <Skeleton className="h-5 w-40" />
        <div className="mt-5 space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-56 max-w-full" />
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
