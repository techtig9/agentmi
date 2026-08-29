"use client";

import { useFormState, useFormStatus } from "react-dom";
import { removeWorkflowMember, type AddMemberState } from "@/lib/actions/workflows";

const initialState: AddMemberState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-neon-pink hover:underline">
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

export function RemoveWorkflowMemberButton({ workflowId, agentId }: { workflowId: string; agentId: string }) {
  const [, formAction] = useFormState(removeWorkflowMember, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="workflowId" value={workflowId} />
      <input type="hidden" name="agentId" value={agentId} />
      <SubmitButton />
    </form>
  );
}
