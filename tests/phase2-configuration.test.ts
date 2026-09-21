import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { required, ConfigurationError, isConfigurationError } from "../lib/config/env";
import { notConfiguredBody } from "../lib/api/not-configured";

test("required returns the value when it is present", () => {
  assert.equal(required("https://x.supabase.co", "NEXT_PUBLIC_SUPABASE_URL"), "https://x.supabase.co");
});

test("required rejects undefined, empty and whitespace-only values", () => {
  for (const value of [undefined, "", "   ", "\t\n"]) {
    assert.throws(() => required(value, "SOME_VAR"), ConfigurationError);
  }
});

test("the error names the variable so a route can report it", () => {
  try {
    required(undefined, "PADDLE_WEBHOOK_SECRET");
    assert.fail("should have thrown");
  } catch (error) {
    assert.ok(isConfigurationError(error));
    assert.equal((error as ConfigurationError).variable, "PADDLE_WEBHOOK_SECRET");
    assert.match((error as Error).message, /PADDLE_WEBHOOK_SECRET/);
  }
});

test("a non-configuration error is not misreported as one", () => {
  assert.equal(isConfigurationError(new TypeError("unrelated")), false);
});

test("the not-configured body carries a code and never a value", () => {
  const body = notConfiguredBody("SUPABASE_SERVICE_ROLE_KEY");
  assert.equal(body.code, "not_configured");
  assert.match(body.detail, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(JSON.stringify(body), /eyJ|sb_secret/);
});

// ---------------------------------------------------------------------------
// Repo-wide guarantees from the phase 2 mandate.
// ---------------------------------------------------------------------------

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const root = new URL("..", import.meta.url).pathname;
const sources = [
  ...walk(join(root, "app")),
  ...walk(join(root, "lib")),
  ...walk(join(root, "components")),
  join(root, "middleware.ts"),
];

test("no environment variable is read with a non-null assertion", () => {
  const offenders = sources.filter((f) => /process\.env\.[A-Z_]+!/.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, [], "use required(process.env.X, \"X\") instead of process.env.X!");
});

test("no hardcoded localhost origin ships in application code", () => {
  const offenders = sources.filter((f) => /https?:\/\/(localhost|127\.0\.0\.1):3000/.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
});

test("every feature API route guards missing configuration", () => {
  // /api/health is liveness only and /api/ready reports configuration itself,
  // so neither builds a client and neither needs the guard.
  const exempt = new Set(["health", "ready"]);
  const routes = walk(join(root, "app", "api")).filter((f) => f.endsWith("route.ts"));
  assert.ok(routes.length >= 10, "expected the API surface to still be present");

  const unguarded = routes.filter((f) => {
    if ([...exempt].some((name) => f.includes(`/api/${name}/`))) return false;
    return !readFileSync(f, "utf8").includes("guardConfigured");
  });
  assert.deepEqual(unguarded, [], "these routes would throw instead of answering 503");
});

test(".env.example marks every variable required or optional", () => {
  const text = readFileSync(join(root, ".env.example"), "utf8");
  const lines = text.split("\n");
  const undocumented: string[] = [];

  lines.forEach((line, i) => {
    const match = /^([A-Z][A-Z0-9_]*)=/.exec(line);
    if (!match) return;
    // Walk back over the contiguous comment block above the assignment.
    let j = i - 1;
    let block = "";
    while (j >= 0 && lines[j].startsWith("#")) {
      block = lines[j] + "\n" + block;
      j -= 1;
    }
    if (!/\[(required|optional)\]/.test(block)) undocumented.push(match[1]);
  });

  assert.deepEqual(undocumented, []);
});
