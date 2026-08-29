"use client";

import { StepShell } from "./StepShell";
import type { WizardState, WizardAction } from "@/lib/agent-builder/wizard-state";
import { canAdvance } from "@/lib/agent-builder/wizard-state";

const THEME_OPTIONS = [
  { id: "cyber_neon", label: "Cyber Neon", swatch: "linear-gradient(135deg,#00F0FF,#B026FF)" },
  { id: "minimal_light", label: "Minimal Light", swatch: "linear-gradient(135deg,#F4F6FB,#9AA0B4)" },
  { id: "corporate_blue", label: "Corporate Blue", swatch: "linear-gradient(135deg,#1B3A6B,#3B82F6)" },
  { id: "dark_glass", label: "Dark Glass", swatch: "linear-gradient(135deg,#121218,#1B1B24)" },
] as const;

interface Props {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  onNext: () => void;
  onBack: () => void;
}

export function ThemeStep({ state, dispatch, onNext, onBack }: Props) {
  return (
    <StepShell
      currentStep="theme"
      title="Choose a theme"
      subtitle="How your agent's chat widget and dashboard will look."
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!canAdvance(state)}
    >
      <div className="grid grid-cols-2 gap-3">
        {THEME_OPTIONS.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => dispatch({ type: "SELECT_THEME", theme: theme.id })}
            className={`neon-card p-4 text-left transition-all duration-200 ${
              state.theme === theme.id ? "border-neon-cyan/60 shadow-neon-cyan" : ""
            }`}
          >
            <div
              className="h-10 rounded-md mb-3"
              style={{ background: theme.swatch }}
              aria-hidden
            />
            <span className="text-sm font-medium">{theme.label}</span>
          </button>
        ))}
      </div>
    </StepShell>
  );
}
