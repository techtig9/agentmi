"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { StepShell } from "./StepShell";
import { TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
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

export function ReviewStep({ state, onBack, templates, buildCost, isAdmin }: Props) {
  const template = templates.find((t) => t.id === state.templateId);
  const [name, setName] = useState(template?.name ?? "My Agent");
  const [formState, formAction] = useFormState(createAgent, initialState);

  return (
    <StepShell
      currentStep="review"
      title="Review & build"
      subtitle="Check the configuration, then build. You can change any of this afterwards in the builder."
      onBack={onBack}
      help={
        <>
          <p>
            Building charges {isAdmin ? "nothing on an admin account" : `${buildCost} credits`} once.
            Nothing is charged while you are still on this step.
          </p>
          <p>
            Knowledge, tools and instructions can all be added or changed later without rebuilding
            the agent.
          </p>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <TextField
          id="agent-name"
          label="Agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={80}
          hint="You can rename this at any time."
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
            <div className="mb-3">
              <FormAlert message={formState.error} />
            </div>
          )}
          <div className="flex justify-end">
            <SubmitButton pendingLabel="Building…" disabled={name.trim().length < 2}>
              Build my agent
            </SubmitButton>
          </div>
        </form>
      </div>
    </StepShell>
  );
}
