"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { enrollMfaFactor, verifyMfaEnrollment, unenrollMfaFactor, type VerifyEnrollState } from "@/lib/actions/mfa";
import { NeonInput } from "@/components/ui/NeonInput";

const initialState: VerifyEnrollState = { error: null };

function VerifyButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-sm">
      {pending ? "Verifying…" : "Enable two-factor authentication"}
    </button>
  );
}

export function MfaEnrollment({ factor }: { factor: { id: string } | null }) {
  const [enrollment, setEnrollment] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [state, formAction] = useFormState(verifyMfaEnrollment, initialState);

  if (factor) {
    return (
      <div>
        <p className="text-sm text-neon-green mb-3">Two-factor authentication is enabled on your account.</p>
        <form action={unenrollMfaFactor}>
          <input type="hidden" name="factorId" value={factor.id} />
          <button type="submit" className="text-xs text-neon-pink">
            Disable two-factor authentication
          </button>
        </form>
      </div>
    );
  }

  if (state.success) {
    return <p className="text-sm text-neon-green">Two-factor authentication is now enabled. Refresh to see the updated status.</p>;
  }

  if (!enrollment) {
    return (
      <div>
        <p className="text-sm text-ink-400 mb-3">
          Add an authenticator app (Google Authenticator, 1Password, Authy) as a second sign-in step.
        </p>
        {startError && <p className="text-sm text-neon-pink mb-3">{startError}</p>}
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={starting}
          onClick={async () => {
            setStarting(true);
            setStartError(null);
            const result = await enrollMfaFactor();
            setStarting(false);
            if (result.error || !result.factorId || !result.qrCode) {
              setStartError(result.error ?? "Couldn't start enrollment. Please try again.");
              return;
            }
            setEnrollment({ factorId: result.factorId, qrCode: result.qrCode, secret: result.secret ?? "" });
          }}
        >
          {starting ? "Starting…" : "Enable two-factor authentication"}
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="factorId" value={enrollment.factorId} />
      <p className="text-sm text-ink-400">Scan this with your authenticator app, or enter the key manually.</p>
      <div className="bg-ink-100 rounded-lg p-3 w-fit" dangerouslySetInnerHTML={{ __html: enrollment.qrCode }} />
      <p className="font-mono text-xs text-ink-400 break-all">{enrollment.secret}</p>
      <NeonInput
        id="mfa-code"
        name="code"
        label="6-digit code"
        required
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        autoComplete="one-time-code"
      />
      {state.error && (
        <p role="alert" className="text-neon-pink text-sm">
          {state.error}
        </p>
      )}
      <VerifyButton />
    </form>
  );
}
