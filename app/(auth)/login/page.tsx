"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { signIn, type AuthActionState } from "@/lib/actions/auth";
import { NeonInput } from "@/components/ui/NeonInput";

const initialState: AuthActionState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full mt-2">
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

function LoginForm() {
  const [state, formAction] = useFormState(signIn, initialState);
  const next = useSearchParams().get("next") ?? "/dashboard";

  return (
    <>
      <h1 className="text-lg font-bold text-center mb-6">Welcome back</h1>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <NeonInput id="email" name="email" type="email" label="Email" required autoComplete="email" />
        <NeonInput
          id="password"
          name="password"
          type="password"
          label="Password"
          required
          autoComplete="current-password"
        />
        {state.error && (
          <p role="alert" className="text-neon-pink text-sm">
            {state.error}
          </p>
        )}
        <SubmitButton />
      </form>
      <p className="text-center text-sm text-ink-400 mt-6">
        New to Agentmi?{" "}
        <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-neon-cyan hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
