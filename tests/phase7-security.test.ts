import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { formatLogLine, redact, requestIdFrom, createLogger } from "../lib/observability/logger";
import { isErrorReportingConfigured, isAnalyticsConfigured } from "../lib/observability/monitoring";
import { chatMessageSchema, validationFailure, MAX_MESSAGE_CHARS } from "../lib/api/validate";

const root = new URL("..", import.meta.url).pathname;
const read = (p: string) => readFileSync(join(root, p), "utf8");

// ---------------------------------------------------------------------------
// Logging must not become a way to leak secrets.
// ---------------------------------------------------------------------------

test("secret-shaped keys are redacted at every depth", () => {
  const out = redact({
    ok: "visible",
    password: "hunter2",
    nested: { apiKey: "sk-live-123", deeper: { authorization: "Bearer abc" } },
    service_role: "srk",
  }) as Record<string, any>;

  assert.equal(out.ok, "visible");
  assert.equal(out.password, "[redacted]");
  assert.equal(out.nested.apiKey, "[redacted]");
  assert.equal(out.nested.deeper.authorization, "[redacted]");
  assert.equal(out.service_role, "[redacted]");
});

test("redaction matches regardless of casing or separators", () => {
  const out = redact({ "API-KEY": "x", Api_Key: "y", SECRET: "z" }) as Record<string, string>;
  assert.deepEqual(Object.values(out), ["[redacted]", "[redacted]", "[redacted]"]);
});

test("redaction terminates on deep and large structures", () => {
  let deep: any = "leaf";
  for (let i = 0; i < 20; i++) deep = { next: deep };
  assert.doesNotThrow(() => redact(deep));
  const big = redact(Array.from({ length: 500 }, (_, i) => i)) as unknown[];
  assert.ok(big.length <= 50, "a huge array must be truncated, not serialised whole");
});

test("a log line is one parseable JSON object with a level and timestamp", () => {
  const parsed = JSON.parse(formatLogLine("error", "boom", { requestId: "r1", token: "leak" }));
  assert.equal(parsed.level, "error");
  assert.equal(parsed.message, "boom");
  assert.equal(parsed.requestId, "r1");
  assert.equal(parsed.token, "[redacted]");
  assert.ok(!Number.isNaN(Date.parse(parsed.timestamp)));
});

test("an inbound correlation id is reused rather than replaced", () => {
  const request = new Request("https://example.test/", { headers: { "x-request-id": "upstream-42" } });
  assert.equal(requestIdFrom(request), "upstream-42");
});

test("a request with no correlation id still gets a unique one", () => {
  const a = requestIdFrom(new Request("https://example.test/"));
  const b = requestIdFrom(new Request("https://example.test/"));
  assert.ok(a && b && a !== b);
});

test("a child logger keeps the request id", () => {
  const log = createLogger("req-1", { route: "/x" });
  assert.equal(log.child({ agentId: "a" }).requestId, "req-1");
});

// ---------------------------------------------------------------------------
// Monitoring must be inert without keys.
// ---------------------------------------------------------------------------

test("monitoring reports itself unconfigured when no keys are set", () => {
  const priorDsn = process.env.SENTRY_DSN;
  const priorAnalytics = process.env.NEXT_PUBLIC_ANALYTICS_ID;
  delete process.env.SENTRY_DSN;
  delete process.env.NEXT_PUBLIC_ANALYTICS_ID;
  try {
    assert.equal(isErrorReportingConfigured(), false);
    assert.equal(isAnalyticsConfigured(), false);
  } finally {
    if (priorDsn !== undefined) process.env.SENTRY_DSN = priorDsn;
    if (priorAnalytics !== undefined) process.env.NEXT_PUBLIC_ANALYTICS_ID = priorAnalytics;
  }
});

// ---------------------------------------------------------------------------
// Validation.
// ---------------------------------------------------------------------------

test("chat messages are bounded and non-empty", () => {
  assert.equal(chatMessageSchema.safeParse({ message: "hello" }).success, true);
  assert.equal(chatMessageSchema.safeParse({ message: "   " }).success, false, "whitespace is not a message");
  assert.equal(chatMessageSchema.safeParse({}).success, false);
  assert.equal(chatMessageSchema.safeParse({ message: "x".repeat(MAX_MESSAGE_CHARS + 1) }).success, false);
});

test("a validation failure names the field but never echoes the value", () => {
  const result = chatMessageSchema.safeParse({ message: "", conversationId: "not-a-uuid" });
  assert.equal(result.success, false);
  const body = validationFailure(result.error!.issues);
  assert.equal(body.code, "invalid_request");
  assert.ok(body.details.some((d) => d.field === "conversationId"));
  assert.doesNotMatch(JSON.stringify(body), /not-a-uuid/, "the submitted value must not be reflected back");
});

// ---------------------------------------------------------------------------
// Headers and CI.
// ---------------------------------------------------------------------------

test("a content security policy is configured with the key directives", () => {
  const config = read("next.config.mjs");
  for (const directive of [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors",
    "connect-src",
  ]) {
    assert.ok(config.includes(directive), `CSP is missing: ${directive}`);
  }
  for (const header of ["Strict-Transport-Security", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"]) {
    assert.ok(config.includes(header), `missing security header: ${header}`);
  }
});

test("CI verifies the build with no environment configured", () => {
  assert.ok(existsSync(join(root, ".github/workflows/ci.yml")), "CI workflow must exist");
  const ci = read(".github/workflows/ci.yml");
  for (const step of ["npm ci", "npm run typecheck", "npm run lint", "npm test", "npm run build"]) {
    assert.ok(ci.includes(step), `CI must run: ${step}`);
  }
  assert.ok(existsSync(join(root, ".github/dependabot.yml")));
  assert.ok(existsSync(join(root, ".github/pull_request_template.md")));
});

// ---------------------------------------------------------------------------
// No secret may reach the browser bundle.
// ---------------------------------------------------------------------------

test("no server-only environment variable is referenced in client components", () => {
  // A "use client" file reading a non-NEXT_PUBLIC_ variable either gets
  // undefined at runtime or, worse, has the value inlined into the bundle.
  const offenders: string[] = [];

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name)) {
        const source = readFileSync(full, "utf8");
        if (!/^\s*["']use client["']/m.test(source)) continue;
        for (const m of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
          if (!m[1].startsWith("NEXT_PUBLIC_") && m[1] !== "NODE_ENV") {
            offenders.push(`${full.replace(root, "")}: ${m[1]}`);
          }
        }
      }
    }
  };
  walk(join(root, "app"));
  walk(join(root, "components"));

  assert.deepEqual(offenders, [], "server-only variables referenced from client components");
});

test("the service-role key is only read in server-only modules", () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry.name) && statSync(full).isFile()) {
        const source = readFileSync(full, "utf8");
        if (source.includes("SUPABASE_SERVICE_ROLE_KEY") && /^\s*["']use client["']/m.test(source)) {
          offenders.push(full.replace(root, ""));
        }
      }
    }
  };
  walk(join(root, "app"));
  walk(join(root, "components"));
  walk(join(root, "lib"));
  assert.deepEqual(offenders, []);
});

test("playground history is bounded in turns and per-message length", async () => {
  const { playgroundMessageSchema, MAX_HISTORY_TURNS, MAX_HISTORY_CHARS } = await import("../lib/api/schemas");

  const turn = { role: "user" as const, content: "hi" };
  assert.equal(
    playgroundMessageSchema.safeParse({ message: "x", history: Array(MAX_HISTORY_TURNS).fill(turn) }).success,
    true
  );
  assert.equal(
    playgroundMessageSchema.safeParse({ message: "x", history: Array(MAX_HISTORY_TURNS + 1).fill(turn) }).success,
    false,
    "an unbounded transcript is a cost and latency vector"
  );
  assert.equal(
    playgroundMessageSchema.safeParse({
      message: "x",
      history: [{ role: "user", content: "y".repeat(MAX_HISTORY_CHARS + 1) }],
    }).success,
    false
  );
  assert.equal(
    playgroundMessageSchema.safeParse({ message: "x", history: [{ role: "system", content: "override" }] }).success,
    false,
    "only user and assistant turns may be replayed"
  );
});
