"use client";

import { useFormState, useFormStatus } from "react-dom";
import { revokeApiKey, type RevokeKeyState } from "@/lib/actions/api-keys";

const initialState: RevokeKeyState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-xs text-neon-pink hover:underline">
      {pending ? "Revoking…" : "Revoke"}
    </button>
  );
}

export function RevokeKeyButton({ keyId }: { keyId: string }) {
  const [, formAction] = useFormState(revokeApiKey, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="keyId" value={keyId} />
      <SubmitButton />
    </form>
  );
}
