"use client";

import { StepShell } from "./StepShell";
import { classifyBuildIntent } from "@/lib/agent-builder/classify";
import type { WizardState, WizardAction } from "@/lib/agent-builder/wizard-state";
import { canAdvance } from "@/lib/agent-builder/wizard-state";

interface Props {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  onNext: () => void;
}

export function DescribeStep({ state, dispatch, onNext }: Props) {
  const preview = state.description.trim().length >= 10 ? classifyBuildIntent(state.description) : null;

  return (
    <StepShell
      currentStep="describe"
      title="What do you want to build?"
      subtitle="Describe it in plain language — a sentence or two is enough to start."
      onNext={onNext}
      nextDisabled={!canAdvance(state)}
      help={
        <>
          <p>
            Say what the agent should <strong className="text-ink-100">do</strong>, who it is{" "}
            <strong className="text-ink-100">for</strong>, and what it should do when it is unsure.
          </p>
          <p>
            Mentioning data you want to predict from (a spreadsheet, historical numbers) points the
            wizard at an ML agent instead.
          </p>
          <p className="text-ink-600">At least 10 characters to continue.</p>
        </>
      }
    >
      <textarea
        autoFocus
        rows={4}
        value={state.description}
        onChange={(e) =>
          dispatch({
            type: "SET_DESCRIPTION",
            description: e.target.value,
            suggestedKind: classifyBuildIntent(e.target.value).kind,
          })
        }
        placeholder="e.g. A chatbot that answers questions from our help docs and hands off to a human when it can't help"
        className="w-full rounded-lg bg-base-900 border border-base-700 px-3.5 py-3 text-ink-100
                   placeholder:text-ink-600 outline-none transition-colors duration-200
                   focus:border-neon-cyan/60 focus:shadow-neon-cyan resize-none"
      />
      {preview && (
        <p className="text-sm text-ink-400 mt-3">
          Sounds like an <span className="text-neon-cyan font-medium">{preview.kind === "ai" ? "AI Agent" : "ML Agent"}</span> — you&apos;ll confirm on the next step.
        </p>
      )}
    </StepShell>
  );
}
