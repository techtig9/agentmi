import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  summarizeRuns,
  bucketRuns,
  providerUsage,
  errorRate,
  rangeOption,
  rangeStart,
  RANGE_OPTIONS,
  type RunRow,
} from "../lib/data/run-metrics";
import { summarizeCreditUsage, labelForReason } from "../lib/data/credit-usage";

const root = path.resolve(process.cwd());
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");

function walk(dir: string, ext: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

test("analytics counts the status values the runtime actually writes", () => {
  /*
   * The regression this guards: Analytics counted runs whose status was
   * 'completed' or 'success', but recordAgentRun only ever writes 'succeeded',
   * 'failed' or 'running'. The success count was therefore always zero and the
   * success rate always rendered 0.0%.
   */
  const recorder = read("lib/observability/record-run.ts");
  assert.ok(
    recorder.includes('"running" | "succeeded" | "failed"'),
    "the recorder's status union is the contract these pages must match"
  );

  for (const page of [
    "app/(dashboard)/dashboard/analytics/page.tsx",
    "app/(dashboard)/dashboard/observability/page.tsx",
  ]) {
    const source = read(page);
    assert.ok(
      source.includes("summarizeRuns"),
      `${page} must use the shared summariser rather than its own status filter`
    );
    for (const wrong of ["'completed'", "'success'", '"completed"', '"success"']) {
      assert.ok(
        !source.includes(`status === ${wrong}`),
        `${page} must not filter on ${wrong} — no run is ever written with that status`
      );
    }
  }
});

test("summarizeRuns recognises succeeded, not completed", () => {
  const rows: RunRow[] = [
    { status: "succeeded", duration_ms: 100, created_at: "2026-03-01T00:00:00Z" },
    { status: "succeeded", duration_ms: 200, created_at: "2026-03-01T00:00:00Z" },
    { status: "failed", duration_ms: 50, created_at: "2026-03-01T00:00:00Z" },
  ];
  const summary = summarizeRuns(rows);
  assert.equal(summary.succeeded, 2, "two succeeded runs must be counted");
  assert.equal(summary.successRate, 67);
  assert.equal(errorRate(summary), 33);
});

test("error rate is null rather than zero when nothing has completed", () => {
  assert.equal(errorRate(summarizeRuns([])), null);
  assert.equal(
    errorRate(summarizeRuns([{ status: "running", duration_ms: null, created_at: "2026-03-01T00:00:00Z" }])),
    null
  );
});

test("range options resolve safely and default to 30 days", () => {
  assert.equal(rangeOption(undefined).id, "30d");
  assert.equal(rangeOption("nonsense").id, "30d", "an unknown range must not throw or pass through");
  assert.equal(rangeOption("24h").hours, 24);
  for (const option of RANGE_OPTIONS) {
    assert.equal(rangeOption(option.id).id, option.id);
  }
});

test("rangeStart is the window's beginning, in the past", () => {
  const now = new Date("2026-03-10T12:00:00Z");
  assert.equal(rangeStart("24h", now), "2026-03-09T12:00:00.000Z");
  assert.ok(new Date(rangeStart("90d", now)) < now);
});

test("bucketing emits empty periods rather than collapsing the axis", () => {
  const now = new Date("2026-03-10T12:00:00Z");
  const rows: RunRow[] = [
    { status: "succeeded", duration_ms: 10, created_at: "2026-03-10T11:30:00Z" },
    { status: "failed", duration_ms: 10, created_at: "2026-03-10T11:35:00Z" },
  ];
  const series = bucketRuns(rows, "24h", now);
  assert.equal(series.length, 24, "a 24h range always has 24 periods, busy or not");
  const total = series.reduce((sum, point) => sum + point.total, 0);
  assert.equal(total, 2);
  assert.ok(
    series.some((point) => point.total === 0),
    "quiet periods must be present as zeroes"
  );
});

test("runs outside the window are ignored rather than clamped into an edge bucket", () => {
  const now = new Date("2026-03-10T12:00:00Z");
  const series = bucketRuns(
    [{ status: "succeeded", duration_ms: 10, created_at: "2026-01-01T00:00:00Z" }],
    "24h",
    now
  );
  assert.equal(series.reduce((sum, p) => sum + p.total, 0), 0);
});

test("provider usage is read from recorded traces and ranked", () => {
  const usage = providerUsage([
    { trace: [{ step: "model", provider: "groq" }, { step: "tool", name: "x" }] },
    { trace: [{ step: "model", provider: "anthropic" }] },
    { trace: [{ step: "model", provider: "groq" }] },
    { trace: null },
    { trace: "not-an-array" },
  ]);
  assert.deepEqual(usage, [
    { label: "groq", count: 2 },
    { label: "anthropic", count: 1 },
  ]);
});

test("provider usage is empty rather than invented when nothing recorded one", () => {
  assert.deepEqual(providerUsage([{ trace: [{ step: "model" }] }]), []);
});

test("credit usage separates spend from grants and ranks by reason", () => {
  const summary = summarizeCreditUsage(
    [
      { amount: -150, entry_type: "consume", reason: "create_ai_agent", created_at: "2026-03-01T00:00:00Z" },
      { amount: -2, entry_type: "consume", reason: "ai_message", created_at: "2026-03-02T00:00:00Z" },
      { amount: -4, entry_type: "consume", reason: "ai_message", created_at: "2026-03-03T00:00:00Z" },
      { amount: 500, entry_type: "grant", reason: "signup_grant", created_at: "2026-03-01T00:00:00Z" },
    ],
    30,
    1000
  );
  assert.equal(summary.spent, 156);
  assert.equal(summary.granted, 500, "a grant must never be counted as spend");
  assert.deepEqual(summary.byReason[0], { label: "Agent builds", count: 150 });
  assert.equal(summary.byReason[1].label, "Agent messages");
});

test("runway is null when nothing has been spent, not Infinity", () => {
  const summary = summarizeCreditUsage([], 30, 500);
  assert.equal(summary.dailyBurn, null);
  assert.equal(summary.daysRemaining, null, "a zero burn rate must not divide into infinite days");
});

test("unknown ledger reasons degrade to readable text", () => {
  assert.equal(labelForReason("ai_message"), "Agent messages");
  assert.equal(labelForReason("some_new_reason"), "some new reason");
});

test("deployment lifecycle actions are role-gated and organization-scoped", () => {
  const actions = read("lib/actions/deployments.ts");
  for (const name of ["disableDeployment", "enableDeployment", "rollbackDeployment"]) {
    assert.ok(actions.includes(`export async function ${name}`), `${name} must exist`);
  }
  const lifecycle = actions.slice(actions.indexOf("export async function disableDeployment"));
  const gates = lifecycle.match(/requireRole\(ctx, \["owner", "admin"\]\)/g) ?? [];
  assert.ok(gates.length >= 3, `each lifecycle action must be role-gated, found ${gates.length}`);
  const scopes = lifecycle.match(/\.eq\("org_id", ctx\.orgId\)/g) ?? [];
  assert.ok(scopes.length >= 6, `every read and write must be org-scoped, found ${scopes.length}`);
});

test("rollback creates a new version instead of mutating deployment history", () => {
  const actions = read("lib/actions/deployments.ts");
  const block = actions.slice(actions.indexOf("export async function rollbackDeployment"));
  assert.ok(block.includes(".insert("), "rollback must insert a new deployment row");
  assert.ok(
    block.includes("rolled_back_from_version"),
    "the new deployment must record what it was rolled back from"
  );
});

test("re-enabling a deployment re-checks that its agent is still ready", () => {
  const actions = read("lib/actions/deployments.ts");
  const block = actions.slice(
    actions.indexOf("export async function enableDeployment"),
    actions.indexOf("export async function rollbackDeployment")
  );
  assert.ok(
    block.includes('agent.status !== "ready"'),
    "a deployment must not be put back online behind an archived or failed agent"
  );
});

test("key rotation issues the replacement before revoking the old key", () => {
  const actions = read("lib/actions/api-keys.ts");
  const block = actions.slice(actions.indexOf("export async function rotateApiKey"));
  const insertAt = block.indexOf('.from("api_keys").insert');
  const revokeAt = block.indexOf("revoked_at: new Date().toISOString()");
  assert.ok(insertAt > -1 && revokeAt > -1);
  assert.ok(
    insertAt < revokeAt,
    "a failure mid-rotation must never leave the workspace with no working key"
  );
});

test("no page renders a real API key or secret value", () => {
  // Only hashes are stored, and freshly generated secrets are surfaced once
  // through RevealOnce. Nothing should ever print key_hash or a secret value.
  for (const file of [...walk(path.join(root, "app"), ".tsx"), ...walk(path.join(root, "components"), ".tsx")]) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(!source.includes("key_hash"), `${path.relative(root, file)} must not render key_hash`);
  }
  const secrets = read("app/(dashboard)/dashboard/secrets/page.tsx");
  assert.ok(
    secrets.includes("secret_ref"),
    "the secrets page shows the variable NAME, which is not a credential"
  );
});

test("the security page does not advertise controls that do not exist", () => {
  const page = read("app/(dashboard)/dashboard/security/page.tsx");
  // An "approvals / human-in-the-loop" gate was advertised but implemented
  // nowhere. Claiming a safety control you do not have is worse than not
  // having it. Comments are stripped first: prose explaining the removal is not
  // a claim made to the user, only rendered text is.
  const shipped = page
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.split("//")[0])
    .join("\n");
  assert.ok(!/human confirmation/i.test(shipped), "the unimplemented approvals control must be gone");
  assert.ok(!/\bHITL\b/.test(shipped));
  assert.ok(page.includes("listFactors"), "MFA status must be read from the real factor list");
});

test("every Tailwind colour class maps to a token the config defines", () => {
  /*
   * ink-500, ink-300, base-600 and friends were used across nine files. Tailwind
   * emits no CSS for an undefined step, so the element silently inherits its
   * parent colour — the styling simply does not happen, with no error anywhere.
   */
  const config = read("tailwind.config.ts");
  const definedInk = [...config.matchAll(/^\s{10}(\d{3}):/gm)].map((m) => m[1]);
  assert.ok(definedInk.length > 0, "sanity check: the config defines numeric colour steps");

  const offenders: string[] = [];
  const pattern = /\b(?:text|bg|border|from|to|via|divide|ring|outline)-(ink|base)-(\d{2,3})\b/g;
  const allowed = { ink: new Set(["100", "400", "600"]), base: new Set(["950", "900", "800", "700"]) };

  for (const file of [...walk(path.join(root, "app"), ".tsx"), ...walk(path.join(root, "components"), ".tsx")]) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(pattern)) {
      const [full, scale, step] = match;
      if (!allowed[scale as "ink" | "base"].has(step)) {
        offenders.push(`${path.relative(root, file)}: ${full}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `undefined colour steps produce no CSS: ${offenders.join(", ")}`);
});

test("run filters are applied in the query so pagination stays correct", () => {
  const page = read("app/(dashboard)/dashboard/runs/page.tsx");
  assert.ok(page.includes('query.eq("agent_id"'), "the agent filter must be applied server-side");
  assert.ok(page.includes('query.eq("status"'), "the status filter must be applied server-side");
  assert.ok(page.includes(".range(from"), "paging must use a database range, not a client slice");
});

test("observability orders its query before claiming to show the latest runs", () => {
  const page = read("app/(dashboard)/dashboard/observability/page.tsx");
  assert.ok(
    page.includes('.order("created_at", { ascending: false })'),
    "an unordered LIMIT returns arbitrary rows, so 'latest' would be untrue"
  );
  assert.ok(page.includes("rangeStart"), "the window must bound the query");
});

test("API samples never embed a real credential", () => {
  const page = read("app/(dashboard)/dashboard/api/page.tsx");
  assert.ok(page.includes("<agentmi-api-key>"), "samples must use the placeholder");
  assert.ok(
    page.includes("process.env.AGENTMI_API_KEY"),
    "code samples should read the key from the environment"
  );
});
