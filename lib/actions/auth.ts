"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidTotpCode } from "@/lib/auth/mfa-code";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type AuthActionState = { error: string | null };

export async function signUp(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const next = (formData.get("next") as string) || "/dashboard";
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}${next}` },
  });

  if (error) return { error: error.message };

  redirect(next);
}

export async function signIn(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const next = (formData.get("next") as string) || "/dashboard";
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: "Incorrect email or password." };

  // signInWithPassword already creates a session at this point, even when
  // the account has TOTP enrolled — the actual second-factor step happens
  // here, not automatically. If the account requires step-up (aal1 -> aal2),
  // send them to the challenge page instead of straight to the dashboard.
  // Middleware also enforces this centrally so the step can't be skipped
  // by navigating directly to a dashboard URL after this redirect.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.currentLevel !== aal.nextLevel) {
    redirect(`/login/mfa?next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export type MfaChallengeState = { error: string | null };

export async function verifyMfaChallenge(_prev: MfaChallengeState, formData: FormData): Promise<MfaChallengeState> {
  const code = String(formData.get("code") || "");
  const next = (formData.get("next") as string) || "/dashboard";
  if (!isValidTotpCode(code)) return { error: "Enter the 6-digit code from your authenticator app." };

  const supabase = createClient();
  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) return { error: "Couldn't verify — please try again." };
  const factor = factorsData.totp.find((f) => f.status === "verified");
  if (!factor) return { error: "No authenticator is set up on this account." };

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challengeError) return { error: "Couldn't verify — please try again." };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) return { error: "That code didn't match. Try again." };

  redirect(next);
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
