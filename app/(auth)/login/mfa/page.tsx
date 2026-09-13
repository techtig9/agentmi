"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useFormState } from "react-dom";
import { ShieldCheck } from "lucide-react";
import { verifyMfaChallenge, type MfaChallengeState } from "@/lib/actions/auth";
import { TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";

const initialState: MfaChallengeState = { error: null };

function MfaChallengeForm() {
  const [state, formAction] = useFormState(verifyMfaChallenge, initialState);
  const next = useSearchParams().get("next") ?? "/dashboard";

  return (
    <>
      <div className="mb-4 flex justify-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10">
          <ShieldCheck size={20} className="text-neon-cyan" aria-hidden="true" />
        </span>
      </div>
      <h1 className="mb-2 text-center text-lg font-bold">Two-factor verification</h1>
      <p className="mb-6 text-center text-sm text-ink-400">
        Enter the 6-digit code from your authenticator app.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <TextField
          id="code"
          name="code"
          label="Authentication code"
          required
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          className="[&_input]:text-center [&_input]:font-mono [&_input]:text-lg [&_input]:tracking-[0.5em]"
        />
        {state.error && <FormAlert message={state.error} />}
        <SubmitButton className="mt-2 w-full" pendingLabel="Verifying…">
          Verify
        </SubmitButton>
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
