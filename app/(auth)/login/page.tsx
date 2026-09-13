"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormState } from "react-dom";
import { signIn, type AuthActionState } from "@/lib/actions/auth";
import { TextField } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";

const initialState: AuthActionState = { error: null };

function LoginForm() {
  const [state, formAction] = useFormState(signIn, initialState);
  const next = useSearchParams().get("next") ?? "/dashboard";

  return (
    <>
      <h1 className="mb-1 text-center text-lg font-bold">Welcome back</h1>
      <p className="mb-6 text-center text-sm text-ink-400">
        Sign in to your Agentmi workspace.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <TextField
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          autoFocus
        />
        <PasswordField
          id="password"
          name="password"
          label="Password"
          required
          autoComplete="current-password"
        />
        {state.error && <FormAlert message={state.error} />}
        <SubmitButton className="mt-2 w-full" pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        New to Agentmi?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="text-neon-cyan hover:underline"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

/** Keeps the card from collapsing while the search-param-dependent form resolves. */
function AuthFormSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Loading…</span>
      <div className="skeleton-shimmer mx-auto h-5 w-32 rounded bg-base-800" aria-hidden="true" />
      <div className="skeleton-shimmer h-16 rounded-lg bg-base-800" aria-hidden="true" />
      <div className="skeleton-shimmer h-16 rounded-lg bg-base-800" aria-hidden="true" />
      <div className="skeleton-shimmer h-11 rounded-lg bg-base-800" aria-hidden="true" />
    </div>
  );
}
