import { test } from "node:test";
import assert from "node:assert/strict";
import { generateApiKey, hashApiKey, verifyApiKey } from "../lib/api-keys/generate";

test("generated key has the expected prefix and length", () => {
  const key = generateApiKey();
  assert.ok(key.fullKey.startsWith("agm_live_"));
  assert.equal(key.fullKey.length, "agm_live_".length + 48); // 24 bytes as hex = 48 chars
});

test("two generated keys are never the same", () => {
  const a = generateApiKey();
  const b = generateApiKey();
  assert.notEqual(a.fullKey, b.fullKey);
});

test("display prefix is a short, safe-to-store slice of the full key", () => {
  const key = generateApiKey();
  assert.ok(key.fullKey.startsWith(key.displayPrefix));
  assert.ok(key.displayPrefix.length < key.fullKey.length);
});

test("hash is deterministic for the same key", () => {
  const key = generateApiKey();
  assert.equal(hashApiKey(key.fullKey), key.hash);
});

test("verifyApiKey accepts the correct key against its stored hash", () => {
  const key = generateApiKey();
  assert.equal(verifyApiKey(key.fullKey, key.hash), true);
});

test("verifyApiKey rejects a wrong key", () => {
  const key = generateApiKey();
  const other = generateApiKey();
  assert.equal(verifyApiKey(other.fullKey, key.hash), false);
});

test("verifyApiKey rejects a key without the expected prefix outright", () => {
  const key = generateApiKey();
  assert.equal(verifyApiKey("not_a_real_key", key.hash), false);
});

test("verifyApiKey rejects a tampered key that still has the right prefix", () => {
  const key = generateApiKey();
  const tampered = key.fullKey.slice(0, -1) + (key.fullKey.at(-1) === "a" ? "b" : "a");
  assert.equal(verifyApiKey(tampered, key.hash), false);
});
