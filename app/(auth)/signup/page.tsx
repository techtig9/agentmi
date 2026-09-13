"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useFormState } from "react-dom";
import { Check } from "lucide-react";
import { signUp, type AuthActionState } from "@/lib/actions/auth";
import { TextField } from "@/components/ui/Field";
import { PasswordField } from "@/components/ui/PasswordField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";

const initialState: AuthActionState = { error: null };

const INCLUDED = [
  "500 free credits",
  "Full platform — no feature gating",
  "No card required",
];

function SignupForm() {
  const [state, formAction] = useFormState(signUp, initialState);
  const next = useSearchParams().get("next") ?? "/dashboard";

  return (
    <>
      <h1 className="mb-1 text-center text-lg font-bold">Start building</h1>
      <p className="mb-5 text-center text-sm text-ink-400">
        Create your workspace and build your first agent.
      </p>

      <ul className="mb-6 space-y-2">
        {INCLUDED.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-ink-400">
            <Check size={14} className="shrink-0 text-neon-green" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>

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
          minLength={8}
          autoComplete="new-password"
          hint="At least 8 characters."
        />
        {state.error && <FormAlert message={state.error} />}
        <SubmitButton className="mt-2 w-full" pendingLabel="Creating account…">
          Create account
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-ink-400">
        Already have an account?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="text-neon-cyan hover:underline"
        >
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
