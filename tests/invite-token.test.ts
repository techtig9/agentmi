import { test } from "node:test";
import assert from "node:assert/strict";
import { generateInviteToken, hashInviteToken, verifyInviteToken } from "../lib/team/invite-token";

test("two generated tokens are never the same", () => {
  const a = generateInviteToken();
  const b = generateInviteToken();
  assert.notEqual(a.fullToken, b.fullToken);
});

test("verifyInviteToken accepts the matching token", () => {
  const token = generateInviteToken();
  assert.equal(verifyInviteToken(token.fullToken, token.hash), true);
});

test("verifyInviteToken rejects a wrong token", () => {
  const a = generateInviteToken();
  const b = generateInviteToken();
  assert.equal(verifyInviteToken(a.fullToken, b.hash), false);
});

test("hash is deterministic", () => {
  const token = generateInviteToken();
  assert.equal(hashInviteToken(token.fullToken), token.hash);
});
