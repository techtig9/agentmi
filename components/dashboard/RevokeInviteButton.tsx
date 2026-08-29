"use client";

import { useFormState, useFormStatus } from "react-dom";
import { revokeInvite, type RevokeInviteState } from "@/lib/actions/team";

const initialState: RevokeInviteState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-neon-pink hover:underline">
      {pending ? "Revoking…" : "Revoke"}
    </button>
  );
}

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const [, formAction] = useFormState(revokeInvite, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="inviteId" value={inviteId} />
      <SubmitButton />
    </form>
  );
}
