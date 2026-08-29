import type { WizardStep } from "@/lib/agent-builder/wizard-state";

const STEP_LABELS: Record<WizardStep, string> = {
  describe: "Describe",
  confirm_type: "Confirm type",
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
  onBack,
  onNext,
  nextDisabled,
  nextLabel = "Continue",
  children,
}: StepShellProps) {
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-1.5 mb-6">
        {STEP_ORDER.map((step, idx) => (
          <span
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              idx <= currentIdx ? "bg-neon-cyan" : "bg-base-700"
            }`}
            title={STEP_LABELS[step]}
          />
        ))}
      </div>

      <h1 className="text-xl font-bold mb-1">{title}</h1>
      {subtitle && <p className="text-ink-400 text-sm mb-6">{subtitle}</p>}

      <div className="mb-8">{children}</div>

      <div className="flex justify-between">
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
  );
}
