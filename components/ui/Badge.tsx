import type { ReactNode } from "react";
import clsx from "clsx";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  CircleDashed,
  Clock,
  Loader2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "border-base-700 bg-base-800 text-ink-400",
  success: "border-neon-green/30 bg-neon-green/10 text-neon-green",
  warning: "border-neon-amber/30 bg-neon-amber/10 text-neon-amber",
  danger: "border-neon-pink/30 bg-neon-pink/10 text-neon-pink",
  info: "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan",
  accent: "border-neon-violet/30 bg-neon-violet/10 text-neon-violet",
};

export function Badge({
  children,
  tone = "neutral",
  icon: Icon,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className
      )}
    >
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  );
}

/**
 * Canonical mapping from the status strings the database actually stores to a
 * tone + icon. Centralised because the same status was previously coloured
 * differently on different screens.
 *
 * Every entry carries an icon as well as a colour: WCAG 2.2 requires status be
 * distinguishable without relying on colour alone.
 */
const STATUS_MAP: Record<string, { tone: BadgeTone; icon: LucideIcon; label?: string }> = {
  // agents
  ready: { tone: "success", icon: CheckCircle2 },
  active: { tone: "success", icon: CheckCircle2 },
  live: { tone: "success", icon: CheckCircle2 },
  training: { tone: "info", icon: Loader2 },
  deploying: { tone: "info", icon: Loader2 },
  running: { tone: "info", icon: Loader2 },
  queued: { tone: "warning", icon: Clock },
  pending: { tone: "warning", icon: Clock },
  draft: { tone: "neutral", icon: CircleDashed },
  disconnected: { tone: "neutral", icon: CircleDashed },
  archived: { tone: "neutral", icon: Archive },
  // terminal states
  failed: { tone: "danger", icon: XCircle },
  error: { tone: "danger", icon: XCircle },
  revoked: { tone: "danger", icon: XCircle },
  cancelled: { tone: "neutral", icon: XCircle },
  succeeded: { tone: "success", icon: CheckCircle2 },
  completed: { tone: "success", icon: CheckCircle2 },
  connected: { tone: "success", icon: CheckCircle2 },
  passed: { tone: "success", icon: CheckCircle2 },
  rolled_back: { tone: "warning", icon: AlertTriangle, label: "rolled back" },
};

/**
 * Renders a status string from the database with consistent tone + icon.
 * Unknown statuses degrade to a neutral badge rather than throwing, so a new
 * status value added server-side never breaks a page.
 */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = status?.toLowerCase().replace(/[\s-]/g, "_") ?? "";
  const entry = STATUS_MAP[key] ?? { tone: "neutral" as BadgeTone, icon: CircleDashed };
  const spins = key === "training" || key === "deploying" || key === "running";
  const Icon = entry.icon;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        TONE_CLASS[entry.tone],
        className
      )}
    >
      <Icon
        size={12}
        aria-hidden="true"
        className={spins ? "animate-spin motion-reduce:animate-none" : undefined}
      />
      {entry.label ?? status}
    </span>
  );
}
