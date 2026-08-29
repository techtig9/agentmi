"use client";

import { StepShell } from "./StepShell";
import type { WizardState, WizardAction } from "@/lib/agent-builder/wizard-state";
import { canAdvance } from "@/lib/agent-builder/wizard-state";

export interface TemplateOption {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  onNext: () => void;
  onBack: () => void;
  templates: TemplateOption[];
}

export function TemplateStep({ state, dispatch, onNext, onBack, templates }: Props) {
  return (
    <StepShell
      currentStep="template"
      title="Pick a starting template"
      subtitle="You can customize everything after creation."
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!canAdvance(state)}
    >
      <div className="flex flex-col gap-3">
        {templates.length === 0 && (
          <p className="text-sm text-ink-400">
            No templates found — run supabase/seed_templates.sql against your project.
          </p>
        )}
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dispatch({ type: "SELECT_TEMPLATE", templateId: t.id })}
            className={`neon-card text-left p-5 w-full transition-all duration-200 ${
              state.templateId === t.id ? "border-neon-cyan/60 shadow-neon-cyan" : ""
            }`}
          >
            <span className="font-display font-bold block mb-1">{t.name}</span>
            {t.description && <p className="text-sm text-ink-400">{t.description}</p>}
          </button>
        ))}
      </div>
    </StepShell>
  );
}
