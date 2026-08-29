"use client";

import { StepShell } from "./StepShell";
import type { WizardState, WizardAction } from "@/lib/agent-builder/wizard-state";

interface Props {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  onNext: () => void;
  onBack: () => void;
}

export function DataSourceStep({ state, dispatch, onNext, onBack }: Props) {
  return (
    <StepShell
      currentStep="data_source"
      title="Add knowledge (optional)"
      subtitle="Paste FAQ or docs content now, or skip and add it after your agent is created."
      onNext={onNext}
      onBack={onBack}
    >
      <textarea
        rows={6}
        value={state.dataSourceRef ?? ""}
        onChange={(e) => dispatch({ type: "SET_DATA_SOURCE", ref: e.target.value || null })}
        placeholder="Paste your FAQ, product docs, or policy text here…"
        className="w-full rounded-lg bg-base-900 border border-base-700 px-3.5 py-3 text-ink-100
                   placeholder:text-ink-600 outline-none transition-colors duration-200
                   focus:border-neon-cyan/60 focus:shadow-neon-cyan resize-none"
      />
      <p className="text-xs text-ink-600 mt-2">
        This gets chunked and embedded into your agent&apos;s knowledge base on the next step.
        File upload and automatic re-indexing land in a future phase — for now, paste text directly.
      </p>
    </StepShell>
  );
}
