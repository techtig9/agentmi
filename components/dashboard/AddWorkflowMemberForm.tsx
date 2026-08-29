"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addWorkflowMember, type AddMemberState } from "@/lib/actions/workflows";

const initialState: AddMemberState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary text-xs px-3 py-1.5">
      {pending ? "Adding…" : "Add"}
    </button>
  );
}

export function AddWorkflowMemberForm({
  workflowId,
  availableAgents,
}: {
  workflowId: string;
  availableAgents: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(addWorkflowMember, initialState);

  if (availableAgents.length === 0) {
    return <p className="text-xs text-ink-600">No other ready AI agents available to add.</p>;
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="workflowId" value={workflowId} />
      <select
        name="agentId"
        required
        className="rounded-lg bg-base-900 border border-base-700 px-2.5 py-1.5 text-sm text-ink-100 outline-none"
      >
        {availableAgents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <input
        name="keywords"
        placeholder="keywords (comma-separated, optional)"
        className="rounded-lg bg-base-900 border border-base-700 px-2.5 py-1.5 text-sm text-ink-100 outline-none w-56"
      />
      <SubmitButton />
      {state.error && <p className="text-neon-pink text-xs">{state.error}</p>}
    </form>
  );
}
