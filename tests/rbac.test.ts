import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { requireRole } from "../lib/data/org-context";

test("requireRole allows an org member whose role is in the allowed list", () => {
  assert.equal(requireRole({ role: "admin", isAdmin: false }, ["owner", "admin"]), null);
  assert.equal(requireRole({ role: "owner", isAdmin: false }, ["owner"]), null);
});

test("requireRole denies an org member whose role is not in the allowed list", () => {
  const denied = requireRole({ role: "member", isAdmin: false }, ["owner", "admin"]);
  assert.ok(denied, "a plain member must be denied an owner/admin-only action");
  assert.equal(typeof denied, "string");
});

test("requireRole denies an admin for an owner-only action", () => {
  const denied = requireRole({ role: "admin", isAdmin: false }, ["owner"]);
  assert.ok(denied, "admin must not pass an owner-only gate");
});

test("requireRole always allows a platform admin regardless of org role", () => {
  assert.equal(requireRole({ role: "member", isAdmin: true }, ["owner"]), null);
});

// Static contract: the audit found these six action files performing
// privileged, org-scoped mutations (invite/revoke teammates, API keys,
// webhooks, secrets, integrations, deployments, org rename, billing) with
// no role check at all — meaning any "member" had owner-level power. This
// scans the actual source for each fixed call site so a future edit that
// silently drops requireRole() fails the regression suite instead of
// re-opening the gap invisibly.
const root = path.resolve(process.cwd());

const expectedGates: Record<string, number> = {
  "lib/actions/team.ts": 2, // inviteTeamMember, revokeInvite
  "lib/actions/api-keys.ts": 2, // createApiKey, revokeApiKey
  "lib/actions/webhooks.ts": 2, // upsertWebhookEndpoint, deactivateWebhookEndpoint
  "lib/actions/governance.ts": 4, // createSecret, revokeSecret, createIntegration, disconnectIntegration
  "lib/actions/deployments.ts": 1, // createDeployment
  "lib/actions/organizations.ts": 1, // updateOrganizationName
  "lib/actions/billing.ts": 1, // startCheckout
};

test("every previously-unguarded privileged action now calls requireRole", () => {
  for (const [file, expectedCount] of Object.entries(expectedGates)) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    const actualCount = (source.match(/requireRole\(ctx,/g) ?? []).length;
    assert.equal(
      actualCount,
      expectedCount,
      `${file} should call requireRole ${expectedCount} time(s), found ${actualCount} — RBAC gap may have regressed`
    );
  }
});
