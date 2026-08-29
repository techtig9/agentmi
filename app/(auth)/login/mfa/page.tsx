"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { verifyMfaChallenge, type MfaChallengeState } from "@/lib/actions/auth";
import { NeonInput } from "@/components/ui/NeonInput";

const initialState: MfaChallengeState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full mt-2">
      {pending ? "Verifying…" : "Verify"}
    </button>
  );
}

function MfaChallengeForm() {
  const [state, formAction] = useFormState(verifyMfaChallenge, initialState);
  const next = useSearchParams().get("next") ?? "/dashboard";

  return (
    <>
      <h1 className="text-lg font-bold text-center mb-2">Two-factor verification</h1>
      <p className="text-sm text-ink-400 text-center mb-6">
        Enter the 6-digit code from your authenticator app.
      </p>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <NeonInput
          id="code"
          name="code"
          label="Authentication code"
          required
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
        />
        {state.error && (
          <p role="alert" className="text-neon-pink text-sm">
            {state.error}
          </p>
        )}
        <SubmitButton />
      </form>
    </>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense fallback={null}>
      <MfaChallengeForm />
    </Suspense>
  );
}
