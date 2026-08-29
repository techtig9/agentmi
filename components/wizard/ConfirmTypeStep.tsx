"use client";

import { useRouter } from "next/navigation";
import { StepShell } from "./StepShell";
import type { WizardState, WizardAction } from "@/lib/agent-builder/wizard-state";
import { canAdvance } from "@/lib/agent-builder/wizard-state";
import type { AgentKind } from "@/lib/agent-builder/classify";

interface Props {
  state: WizardState;
  dispatch: (action: WizardAction) => void;
  onNext: () => void;
  onBack: () => void;
}

function TypeCard({
  kind,
  title,
  description,
  selected,
  onSelect,
}: {
  kind: AgentKind;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-agent-kind={kind}
      onClick={onSelect}
      className={`neon-card text-left p-5 w-full transition-all duration-200 ${
        selected ? "border-neon-cyan/60 shadow-neon-cyan" : ""
      }`}
    >
      <span className="font-display font-bold block mb-2">{title}</span>
      <p className="text-sm text-ink-400">{description}</p>
    </button>
  );
}

export function ConfirmTypeStep({ state, dispatch, onNext, onBack }: Props) {
  const router = useRouter();

  return (
    <StepShell
      currentStep="confirm_type"
      title="Confirm what you're building"
      onNext={onNext}
      onBack={onBack}
      nextDisabled={!canAdvance(state)}
    >
      <div className="flex flex-col gap-3">
        <TypeCard
          kind="ai"
          title="AI Agent"
          description="A conversational agent — support, sales, internal Q&A. No dataset needed."
          selected={state.confirmedKind === "ai"}
          onSelect={() => dispatch({ type: "CONFIRM_TYPE", kind: "ai" })}
        />
        <TypeCard
          kind="ml"
          title="ML Agent"
          description="A trained model for prediction/classification from your CSV data. Takes you to a focused dataset + target-column flow."
          selected={state.confirmedKind === "ml"}
          onSelect={() => {
            dispatch({ type: "CONFIRM_TYPE", kind: "ml" });
            router.push("/dashboard/create/ml");
          }}
        />
      </div>
      {state.suggestedKind === "ml" && state.confirmedKind !== "ml" && (
        <p className="text-sm text-neon-violet mt-4">
          Your description sounds like an ML use case — select ML Agent above to jump to the
          dataset upload flow.
        </p>
      )}
    </StepShell>
  );
}
