"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidTotpCode } from "@/lib/auth/mfa-code";

export type EnrollState = { error: string | null; factorId?: string; qrCode?: string; secret?: string };

/**
 * Starts TOTP enrollment. Called directly from a client-component event
 * handler (not a <form action>) since it needs to return the QR code
 * before any form exists to submit — Next.js server actions can be
 * invoked as plain async functions from client code, not just via forms.
 */
export async function enrollMfaFactor(): Promise<EnrollState> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
  if (error) return { error: error.message };
  if (data.type !== "totp") return { error: "Unexpected factor type returned." };
  return { error: null, factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export type VerifyEnrollState = { error: string | null; success?: boolean };

export async function verifyMfaEnrollment(_prev: VerifyEnrollState, formData: FormData): Promise<VerifyEnrollState> {
  const factorId = String(formData.get("factorId") || "");
  if (!factorId) return { error: "Enrollment session expired — start again." };
  const code = String(formData.get("code") || "");
  if (!isValidTotpCode(code)) return { error: "Enter the 6-digit code from your authenticator app." };

  const supabase = createClient();
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { error: challengeError.message };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) return { error: "That code didn't match. Check your authenticator app and try again." };

  revalidatePath("/dashboard/settings");
  return { error: null, success: true };
}

export async function unenrollMfaFactor(formData: FormData) {
  const factorId = String(formData.get("factorId") || "");
  if (!factorId) throw new Error("Missing factor.");
  const supabase = createClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/settings");
}
