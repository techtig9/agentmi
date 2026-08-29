import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isValidTotpCode } from "../lib/auth/mfa-code";

test("isValidTotpCode accepts a well-formed 6-digit code", () => {
  assert.equal(isValidTotpCode("123456"), true);
  assert.equal(isValidTotpCode("000000"), true);
});

test("isValidTotpCode rejects wrong-length input", () => {
  assert.equal(isValidTotpCode("12345"), false);
  assert.equal(isValidTotpCode("1234567"), false);
  assert.equal(isValidTotpCode(""), false);
});

test("isValidTotpCode rejects non-digit input", () => {
  assert.equal(isValidTotpCode("12a456"), false);
  assert.equal(isValidTotpCode(" 23456"), false);
  assert.equal(isValidTotpCode("123 456"), false);
});

const root = path.resolve(process.cwd());

test("middleware enforces MFA step-up centrally for dashboard/admin routes", () => {
  const source = fs.readFileSync(path.join(root, "middleware.ts"), "utf8");
  assert.ok(
    source.includes("getAuthenticatorAssuranceLevel"),
    "middleware must check the authenticator assurance level, not just session presence"
  );
  assert.ok(
    source.includes('"/login/mfa"'),
    "middleware must redirect to the MFA challenge page when step-up is required"
  );
  // Guards against the actual bypass this closes: a session exists as soon
  // as signInWithPassword succeeds, even for an account with TOTP enrolled.
  // If this check is ever narrowed to only run on isDashboardRoute without
  // isAdminRoute (or removed), admin routes would be reachable with only a
  // password.
  assert.match(
    source,
    /isDashboardRoute\s*\|\|\s*isAdminRoute\)\)\s*\{\s*\n\s*const \{ data: aal \}/,
    "AAL check must guard both dashboard and admin routes"
  );
});

test("signIn checks assurance level after password verification and redirects to the MFA challenge when required", () => {
  const source = fs.readFileSync(path.join(root, "lib/actions/auth.ts"), "utf8");
  const signInBody = source.slice(source.indexOf("export async function signIn"), source.indexOf("export type MfaChallengeState"));
  assert.ok(signInBody.includes("getAuthenticatorAssuranceLevel"), "signIn must check AAL after password verification");
  assert.ok(signInBody.includes("/login/mfa"), "signIn must redirect to the MFA challenge page when step-up is required");
});
