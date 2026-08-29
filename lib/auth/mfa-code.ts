/** A TOTP code from an authenticator app is always exactly 6 digits. */
export function isValidTotpCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}
