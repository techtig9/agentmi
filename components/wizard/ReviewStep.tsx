"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { StepShell } from "./StepShell";
import { NeonInput } from "@/components/ui/NeonInput";
import { createAgent, type CreateAgentState } from "@/lib/actions/agents";
import type { WizardState } from "@/lib/agent-builder/wizard-state";
import type { TemplateOption } from "./TemplateStep";

interface Props {
  state: WizardState;
  onBack: () => void;
  templates: TemplateOption[];
  buildCost: number;
  isAdmin: boolean;
}

const initialState: CreateAgentState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Building…" : "Build my agent"}
    </button>
  );
}

export function ReviewStep({ state, onBack, templates, buildCost, isAdmin }: Props) {
  const template = templates.find((t) => t.id === state.templateId);
  const [name, setName] = useState(template?.name ?? "My Agent");
  const [formState, formAction] = useFormState(createAgent, initialState);

  return (
    <StepShell currentStep="review" title="Review & build" onBack={onBack}>
      <div className="flex flex-col gap-4">
        <NeonInput
          id="agent-name"
          label="Agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <dl className="neon-card p-4 text-sm flex flex-col gap-2">
          <div className="flex justify-between">
            <dt className="text-ink-400">Type</dt>
            <dd>AI Agent</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-400">Template</dt>
            <dd>{template?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-400">Theme</dt>
            <dd className="capitalize">{state.theme?.replace("_", " ")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-400">Knowledge added</dt>
            <dd>{state.dataSourceRef ? "Yes" : "None — add later"}</dd>
          </div>
          <div className="flex justify-between border-t border-base-700 pt-2 mt-1">
            <dt className="text-ink-400">Cost</dt>
            <dd className="font-mono text-neon-cyan">
              {isAdmin ? "Free (admin)" : `${buildCost} credits`}
            </dd>
          </div>
        </dl>

        <form action={formAction}>
          <input type="hidden" name="kind" value={state.confirmedKind ?? "ai"} />
          <input type="hidden" name="templateId" value={state.templateId ?? ""} />
          <input type="hidden" name="theme" value={state.theme ?? ""} />
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="description" value={state.description} />
          <input type="hidden" name="dataSourceRef" value={state.dataSourceRef ?? ""} />

          {formState.error && (
            <p role="alert" className="text-neon-pink text-sm mb-3">
              {formState.error}
            </p>
          )}
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </div>
    </StepShell>
  );
}
