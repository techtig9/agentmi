import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

export interface GeneratedInviteToken {
  fullToken: string; // goes in the invite link, shown once
  hash: string; // what's stored in team_invites.token_hash
}

export function generateInviteToken(): GeneratedInviteToken {
  const fullToken = randomBytes(20).toString("hex");
  return { fullToken, hash: hashInviteToken(fullToken) };
}

export function hashInviteToken(fullToken: string): string {
  return createHash("sha256").update(fullToken).digest("hex");
}

export function verifyInviteToken(providedToken: string, storedHash: string): boolean {
  const providedHash = hashInviteToken(providedToken);
  const a = Buffer.from(providedHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
