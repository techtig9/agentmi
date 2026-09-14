import { Check } from "lucide-react";
import type { WizardStep } from "@/lib/agent-builder/wizard-state";

const STEP_LABELS: Record<WizardStep, string> = {
  describe: "Describe",
  confirm_type: "Agent type",
  template: "Template",
  theme: "Theme",
  data_source: "Knowledge",
  review: "Review",
};
const STEP_ORDER: WizardStep[] = Object.keys(STEP_LABELS) as WizardStep[];

interface StepShellProps {
  currentStep: WizardStep;
  title: string;
  subtitle?: string;
  /** Contextual guidance for the current step, shown beside the form on wide screens. */
  help?: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  children: React.ReactNode;
}

export function StepShell({
  currentStep,
  title,
  subtitle,
  help,
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
  children,
}: StepShellProps) {
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="mx-auto max-w-4xl">
      {/*
        Ordered list rather than bare spans: the progress indicator is real
        structure a screen reader can walk, and aria-current marks the step the
        user is actually on.
      */}
      <nav aria-label="Progress" className="mb-7">
        <p className="mb-3 font-mono text-xs text-ink-600">
          Step {currentIdx + 1} of {STEP_ORDER.length} · {STEP_LABELS[currentStep]}
        </p>
        <ol className="flex items-center gap-1.5">
          {STEP_ORDER.map((step, idx) => {
            const done = idx < currentIdx;
            const active = idx === currentIdx;
            return (
              <li key={step} className="flex-1">
                <span
                  aria-current={active ? "step" : undefined}
                  title={STEP_LABELS[step]}
                  className={`flex h-1.5 items-center justify-center rounded-full transition-colors duration-300 ${
                    done || active ? "bg-neon-cyan" : "bg-base-700"
                  }`}
                >
                  <span className="sr-only">
                    {STEP_LABELS[step]}
                    {done ? " (completed)" : active ? " (current)" : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-ink-400">{subtitle}</p>}

          <div className="mb-8 mt-6">{children}</div>

          <div className="flex justify-between gap-3">
            {onBack ? (
              <button type="button" onClick={onBack} className="btn-secondary">
                Back
              </button>
            ) : (
              <span />
            )}
            {onNext && (
              <button type="button" onClick={onNext} disabled={nextDisabled} className="btn-primary">
                {nextLabel}
              </button>
            )}
          </div>
        </div>

        {help && (
          <aside className="rounded-xl border border-base-700 bg-base-900/60 p-4 lg:sticky lg:top-24 lg:self-start">
            <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neon-cyan">
              <Check size={11} aria-hidden="true" />
              Guidance
            </p>
            <div className="mt-3 space-y-2 text-xs leading-relaxed text-ink-400">{help}</div>
          </aside>
        )}
      </div>
    </div>
  );
}
