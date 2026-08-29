import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

// Key shape: agm_live_<32 random hex chars>. The prefix (agm_live_ + first
// 6 chars) is stored in plaintext for the user to recognize which key is
// which in the UI; the full key is only ever shown once, at creation.

const KEY_PREFIX = "agm_live_";
const SECRET_BYTES = 24;

export interface GeneratedApiKey {
  fullKey: string; // shown to the user exactly once — never persisted
  displayPrefix: string; // safe to store and show in the UI (e.g. "agm_live_a1b2c3…")
  hash: string; // what actually gets stored — sha256 of fullKey
}

export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(SECRET_BYTES).toString("hex");
  const fullKey = `${KEY_PREFIX}${secret}`;
  return {
    fullKey,
    displayPrefix: fullKey.slice(0, KEY_PREFIX.length + 6),
    hash: hashApiKey(fullKey),
  };
}

export function hashApiKey(fullKey: string): string {
  return createHash("sha256").update(fullKey).digest("hex");
}

/** Constant-time comparison — avoids leaking hash-match timing to an attacker probing keys. */
export function verifyApiKey(providedKey: string, storedHash: string): boolean {
  if (!providedKey.startsWith(KEY_PREFIX)) return false;

  const providedHash = hashApiKey(providedKey);
  const a = Buffer.from(providedHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
