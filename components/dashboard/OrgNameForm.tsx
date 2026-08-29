"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateOrganizationName, type UpdateOrgState } from "@/lib/actions/organizations";
import { NeonInput } from "@/components/ui/NeonInput";

const initialState: UpdateOrgState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary text-sm">
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function OrgNameForm({ currentName }: { currentName: string }) {
  const [state, formAction] = useFormState(updateOrganizationName, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="flex-1">
        <NeonInput id="name" name="name" label="Organization name" defaultValue={currentName} required />
      </div>
      <SubmitButton />
      {state.error && <p className="text-neon-pink text-xs">{state.error}</p>}
      {state.success && <p className="text-neon-green text-xs">Saved</p>}
    </form>
  );
}
