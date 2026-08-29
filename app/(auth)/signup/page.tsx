"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { signUp, type AuthActionState } from "@/lib/actions/auth";
import { NeonInput } from "@/components/ui/NeonInput";

const initialState: AuthActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full mt-2">
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

function SignupForm() {
  const [state, formAction] = useFormState(signUp, initialState);
  const next = useSearchParams().get("next") ?? "/dashboard";

  return (
    <>
      <h1 className="text-lg font-bold text-center mb-1">Start building</h1>
      <p className="text-center text-sm text-ink-400 mb-6">
        500 free credits — no card required.
      </p>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <NeonInput id="email" name="email" type="email" label="Email" required autoComplete="email" />
        <NeonInput
          id="password"
          name="password"
          type="password"
          label="Password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        {state.error && (
          <p role="alert" className="text-neon-pink text-sm">
            {state.error}
          </p>
        )}
        <SubmitButton />
      </form>
      <p className="text-center text-sm text-ink-400 mt-6">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-neon-cyan hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
