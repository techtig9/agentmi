"use client";

import { useFormState, useFormStatus } from "react-dom";
import { adminGrantCredits, type AdminActionState } from "@/lib/actions/admin";

const initialState: AdminActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary text-xs px-3 py-1.5">
      {pending ? "Granting…" : "Grant"}
    </button>
  );
}

export function GrantCreditsForm({ orgId }: { orgId: string }) {
  const [state, formAction] = useFormState(adminGrantCredits, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="orgId" value={orgId} />
      <input
        type="number"
        name="amount"
        placeholder="Credits"
        min={1}
        required
        className="w-24 rounded-lg bg-base-900 border border-base-700 px-2.5 py-1.5 text-sm
                   text-ink-100 outline-none focus:border-neon-cyan/60"
      />
      <SubmitButton />
      {state.success && <span className="text-neon-green text-xs">Done</span>}
      {state.error && <span className="text-neon-pink text-xs">{state.error}</span>}
    </form>
  );
}
