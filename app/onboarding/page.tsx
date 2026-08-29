"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createOrganization, type OnboardingState } from "@/lib/actions/organizations";
import { NeonInput } from "@/components/ui/NeonInput";

const initialState: OnboardingState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full mt-2">
      {pending ? "Setting up…" : "Continue to dashboard"}
    </button>
  );
}

export default function OnboardingPage() {
  const [state, formAction] = useFormState(createOrganization, initialState);

  return (
    <div className="aurora-backdrop min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm neon-card p-8">
        <h1 className="text-lg font-bold text-center mb-1">Name your workspace</h1>
        <p className="text-center text-sm text-ink-400 mb-6">
          This is where your agents, credits, and team will live.
        </p>
        <form action={formAction} className="flex flex-col gap-4">
          <NeonInput
            id="name"
            name="name"
            label="Organization name"
            placeholder="e.g. Acme Inc."
            required
            autoFocus
          />
          {state.error && (
            <p role="alert" className="text-neon-pink text-sm">
              {state.error}
            </p>
          )}
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
