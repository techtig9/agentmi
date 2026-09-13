import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import { Loader2, type LucideIcon } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    "bg-neon-cyan text-base-950 font-bold hover:shadow-neon-cyan hover:-translate-y-px",
  secondary:
    "border border-base-700 text-ink-100 hover:border-neon-cyan/50 hover:text-neon-cyan",
  ghost: "text-ink-400 hover:text-ink-100 hover:bg-base-800",
  danger:
    "border border-neon-pink/40 text-neon-pink hover:bg-neon-pink/10 hover:border-neon-pink",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders a spinner, disables the control and marks it busy for screen readers. */
  loading?: boolean;
  /** Leading icon. Omitted while `loading` so the spinner takes its place. */
  icon?: LucideIcon;
}

/**
 * The one button. Every variant/size/state combination lives here so a
 * disabled or loading button looks and behaves identically everywhere.
 *
 * `loading` deliberately also sets `disabled`: a button that shows a spinner
 * but still accepts clicks is how double-submits happen.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, icon: Icon, className, children, disabled, type, ...props },
  ref
) {
  const isDisabled = disabled || loading;
  return (
    <button
      ref={ref}
      // Defaulting to "button" avoids accidental form submits; callers opt in
      // to type="submit" explicitly.
      type={type ?? "button"}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-flex items-center justify-center rounded-lg font-display transition-all duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan",
        "disabled:opacity-40 disabled:pointer-events-none",
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={ICON_SIZE[size]} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        Icon && <Icon size={ICON_SIZE[size]} aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Required: an icon-only control is invisible to screen readers without it. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

/** Square icon-only button. `label` becomes both the accessible name and the tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, variant = "ghost", size = "md", loading = false, className, type, disabled, ...props },
  ref
) {
  const box = size === "sm" ? "h-7 w-7" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      title={label}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-lg transition-all duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-cyan",
        "disabled:opacity-40 disabled:pointer-events-none",
        VARIANT_CLASS[variant],
        box,
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={ICON_SIZE[size]} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <Icon size={ICON_SIZE[size]} aria-hidden="true" />
      )}
    </button>
  );
});
