import type { ReactNode } from "react";
import clsx from "clsx";
import { AlertTriangle, type LucideIcon } from "lucide-react";

/**
 * Empty state: says what the surface is for and gives one obvious next action.
 * Never a bare "No data" — an empty screen is an onboarding opportunity.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-dashed border-base-700 px-6 py-10 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-base-700 bg-base-800">
          <Icon size={20} className="text-ink-400" aria-hidden="true" />
        </div>
      )}
      <p className="font-display font-bold text-ink-100">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-600">{description}</p>}
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * Error state: plain-language message plus a recovery action, with the raw
 * technical detail tucked behind a disclosure so it helps debugging without
 * shouting a stack trace at an end user.
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  details,
  action,
  className,
}: {
  title?: string;
  description?: string;
  details?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={clsx("rounded-xl border border-neon-pink/30 bg-neon-pink/5 p-5", className)}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-neon-pink" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-ink-100">{title}</p>
          {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
          {details && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-ink-600 hover:text-ink-400">
                Technical details
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-base-700 bg-base-900 p-3 text-xs font-mono text-ink-400">
                {details}
              </pre>
            </details>
          )}
          {action && <div className="mt-4 flex gap-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}
