import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSecret } from "../lib/secrets/resolve";
import { verifySlack, verifyGithub, verifyWebhookReachable } from "../lib/integrations/verify";

// Minimal fake of the Supabase query-builder chain resolveSecret actually
// calls (.from().select().eq().eq().is().single()), returning a canned row.
function fakeSupabase(row: Record<string, unknown> | null) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    single: async () => ({ data: row }),
  };
  return { from: () => chain } as unknown as Parameters<typeof resolveSecret>[0];
}

test("resolveSecret returns null when no matching, unrevoked secret exists for the org", async () => {
  const result = await resolveSecret(fakeSupabase(null), "org-1", "secret-1");
  assert.equal(result, null);
});

test("resolveSecret returns null when the referenced environment variable isn't set", async () => {
  const supabase = fakeSupabase({ id: "secret-1", provider: "slack", secret_ref: "SOME_VAR_THAT_IS_NOT_SET_12345", revoked_at: null });
  const result = await resolveSecret(supabase, "org-1", "secret-1");
  assert.equal(result, null);
});

test("resolveSecret resolves the environment variable named by secret_ref", async () => {
  process.env.TEST_RESOLVE_SECRET_VAR = "sk-test-value";
  const supabase = fakeSupabase({ id: "secret-1", provider: "slack", secret_ref: "TEST_RESOLVE_SECRET_VAR", revoked_at: null });
  const result = await resolveSecret(supabase, "org-1", "secret-1");
  assert.deepEqual(result, { value: "sk-test-value", provider: "slack" });
  delete process.env.TEST_RESOLVE_SECRET_VAR;
});

function mockFetch(status: number, body: unknown): typeof fetch {
  return (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

test("verifySlack passes only when Slack's response body says ok:true", async () => {
  const ok = await verifySlack("tok", mockFetch(200, { ok: true, team: "Acme" }));
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.detail, "Connected to Acme");

  const rejected = await verifySlack("bad-tok", mockFetch(200, { ok: false, error: "invalid_auth" }));
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.match(rejected.error, /invalid_auth/);
});

test("verifySlack fails closed on a network error rather than defaulting to connected", async () => {
  const throwingFetch = (async () => { throw new Error("network down"); }) as unknown as typeof fetch;
  const result = await verifySlack("tok", throwingFetch);
  assert.equal(result.ok, false);
});

test("verifyGithub passes only on HTTP 200", async () => {
  const ok = await verifyGithub("tok", mockFetch(200, { login: "octocat" }));
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.detail, "Connected as octocat");

  const rejected = await verifyGithub("bad-tok", mockFetch(401, {}));
  assert.equal(rejected.ok, false);
});

test("verifyWebhookReachable rejects private/local URLs before making any request", async () => {
  const result = await verifyWebhookReachable("http://localhost:3000/hook", undefined, mockFetch(200, {}));
  assert.equal(result.ok, false);
});

test("verifyWebhookReachable treats any real HTTP response, including 4xx, as reachable", async () => {
  const result = await verifyWebhookReachable("https://example.com/hook", undefined, mockFetch(404, {}));
  assert.equal(result.ok, true);
});

test("verifyWebhookReachable fails on a network-level error", async () => {
  const throwingFetch = (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
  const result = await verifyWebhookReachable("https://example.com/hook", undefined, throwingFetch);
  assert.equal(result.ok, false);
});
