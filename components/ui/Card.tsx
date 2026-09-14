import type { ReactNode } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** Violet glow instead of cyan on hover/focus — for secondary-accent panels. */
  accent?: "cyan" | "violet";
  /** Turns off the hover glow for cards that are pure containers, not targets. */
  interactive?: boolean;
}

/**
 * The standard surface. Wraps the existing `.neon-card` class rather than
 * redefining it, so cards converted to this component are pixel-identical to
 * the 90+ hand-inlined ones still in the codebase during migration.
 */
export function Card({ children, className, accent = "cyan", interactive = true }: CardProps) {
  return (
    <div
      className={clsx(
        interactive ? "neon-card" : "bg-base-800/80 border border-base-700 rounded-card backdrop-blur-sm",
        accent === "violet" && "neon-card--accent-violet",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="mt-1 text-xs text-ink-600">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  /** Tints the value. Use sparingly — reserve colour for values that need reading as good/bad. */
  tone?: "default" | "success" | "warning" | "danger" | "accent";
}

const TONE_CLASS: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  default: "text-ink-100",
  success: "text-neon-green",
  warning: "text-neon-amber",
  danger: "text-neon-pink",
  accent: "text-neon-cyan",
};

/** Single headline number with a label and optional qualifier. */
export function MetricCard({ label, value, hint, icon: Icon, tone = "default" }: MetricCardProps) {
  return (
    <div className="neon-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-mono uppercase tracking-wider text-ink-600">{label}</p>
        {Icon && <Icon size={16} className="shrink-0 text-ink-600" aria-hidden="true" />}
      </div>
      <p className={clsx("mt-2 text-2xl font-display font-bold tabular-nums", TONE_CLASS[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-600">{hint}</p>}
    </div>
  );
}
