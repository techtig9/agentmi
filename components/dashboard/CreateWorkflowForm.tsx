"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createWorkflow, type CreateWorkflowState } from "@/lib/actions/workflows";

const initialState: CreateWorkflowState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-sm">
      {pending ? "Creating…" : "Create workflow"}
    </button>
  );
}

export function CreateWorkflowForm() {
  const [state, formAction] = useFormState(createWorkflow, initialState);
  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="flex-1">
        <label className="text-sm text-ink-400 block mb-1.5">Workflow name</label>
        <input
          name="name"
          placeholder="e.g. Customer Support Router"
          required
          className="w-full rounded-lg bg-base-900 border border-base-700 px-3 py-2 text-sm text-ink-100
                     outline-none focus:border-neon-cyan/60"
        />
      </div>
      <SubmitButton />
      {state.error && <p className="text-neon-pink text-sm">{state.error}</p>}
    </form>
  );
}
