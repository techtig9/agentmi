import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const read = (p: string) => readFileSync(root + p, "utf8");

/**
 * The migration list, in dependency order. DEPLOYMENT.md and
 * docs/DEPLOY_VERCEL.md both publish this order; the tests below keep all
 * three in agreement, because a list that silently loses a file leaves a
 * fresh install missing tables.
 */
const MIGRATION_ORDER = [
  "00_agentmi_schema_setup.sql",
  "schema.sql",
  "policies.sql",
  "functions.sql",
  "seed_templates.sql",
  "phase3_schema.sql",
  "phase3_knowledge_sources.sql",
  "phase4_schema.sql",
  "phase4_memory.sql",
  "phase5_schema.sql",
  "phase5_graph.sql",
  "phase6_schema.sql",
  "phase7_10_schema.sql",
  "phase8_governance.sql",
  "phase9_ecosystem.sql",
  "phaseR_support.sql",
];

test("the documented order covers every migration on disk", () => {
  const onDisk = readdirSync(root + "supabase").filter((f) => f.endsWith(".sql")).sort();
  assert.deepEqual([...MIGRATION_ORDER].sort(), onDisk, "a migration is missing from the documented order");
});

test("both deployment guides publish the full order", () => {
  for (const doc of ["DEPLOYMENT.md", "docs/DEPLOY_VERCEL.md"]) {
    const text = read(doc);
    const listed = MIGRATION_ORDER.filter((m) => text.includes(`supabase/${m}`));
    assert.equal(listed.length, MIGRATION_ORDER.length, `${doc} omits ${MIGRATION_ORDER.filter(m => !text.includes(`supabase/${m}`)).join(", ")}`);
    // Order matters as much as completeness.
    const positions = MIGRATION_ORDER.map((m) => text.indexOf(`supabase/${m}`));
    const sorted = [...positions].sort((a, b) => a - b);
    assert.deepEqual(positions, sorted, `${doc} lists the migrations out of order`);
  }
});

test("no migration references a table created later", () => {
  const created = new Set<string>();
  const problems: string[] = [];
  const bare = (name: string) => name.split(".").pop()!.replace(/"/g, "");

  for (const file of MIGRATION_ORDER) {
    const sql = read(`supabase/${file}`);
    const here = new Set(
      [...sql.matchAll(/CREATE TABLE(?: IF NOT EXISTS)?\s+([A-Za-z0-9_."]+)/gi)].map((m) => bare(m[1]))
    );
    for (const m of sql.matchAll(/REFERENCES\s+([A-Za-z0-9_."]+)/gi)) {
      const target = bare(m[1]);
      if (target === "users") continue; // auth.users, owned by Supabase
      if (!here.has(target) && !created.has(target)) problems.push(`${file} references ${target} before it exists`);
    }
    here.forEach((t) => created.add(t));
  }
  assert.deepEqual(problems, []);
});

test("every migration is idempotent so the list can be re-run", () => {
  // Re-running the list must be safe: an operator who reruns a file, or a
  // second environment built from the same list, must not hit "already
  // exists". Each DDL kind has its own idiom — CREATE TYPE has no
  // IF NOT EXISTS clause at all and needs a DO block, and CREATE POLICY needs
  // a preceding DROP POLICY IF EXISTS.
  const offenders: string[] = [];

  for (const file of MIGRATION_ORDER) {
    const sql = read(`supabase/${file}`);

    for (const m of sql.matchAll(/\bcreate\s+table\s+(?!if\s+not\s+exists)([A-Za-z0-9_."]+)/gi)) {
      offenders.push(`${file}: create table ${m[1]} without IF NOT EXISTS`);
    }
    for (const m of sql.matchAll(/\bcreate\s+(?:unique\s+)?index\s+(?!if\s+not\s+exists)([A-Za-z0-9_."]+)/gi)) {
      offenders.push(`${file}: create index ${m[1]} without IF NOT EXISTS`);
    }
    // CREATE TYPE must sit inside a DO block that swallows duplicate_object.
    for (const m of sql.matchAll(/\bcreate\s+type\s+([A-Za-z0-9_."]+)/gi)) {
      const before = sql.slice(Math.max(0, m.index! - 200), m.index!);
      if (!/do \$\$ begin/i.test(before)) {
        offenders.push(`${file}: create type ${m[1]} is not guarded by a DO block`);
      }
    }
    // Every CREATE POLICY needs a DROP POLICY IF EXISTS immediately above it.
    const lines = sql.split("\n");
    lines.forEach((line, i) => {
      const m = /^\s*create\s+policy\s+("[^"]+"|[A-Za-z0-9_]+)/i.exec(line);
      if (!m) return;
      const prev = [...lines.slice(0, i)].reverse().find((l) => l.trim()) ?? "";
      if (!/drop policy if exists/i.test(prev)) {
        offenders.push(`${file}: create policy ${m[1]} without a preceding DROP POLICY IF EXISTS`);
      }
    });
  }

  assert.deepEqual(offenders, []);
});

test("package.json exposes the standard scripts and pins a Node version", () => {
  const pkg = JSON.parse(read("package.json"));
  for (const script of ["dev", "build", "start", "lint", "typecheck", "test"]) {
    assert.ok(pkg.scripts?.[script], `missing script: ${script}`);
  }
  assert.match(pkg.engines?.node ?? "", /\d/, "engines.node must pin a version");
});

test(".gitignore covers build output, secrets and archives", () => {
  const ignore = read(".gitignore");
  for (const entry of ["node_modules", ".next", ".env", ".vercel", "*.zip"]) {
    assert.ok(ignore.includes(entry), `.gitignore must cover ${entry}`);
  }
  assert.ok(read(".env.example").length > 0, ".env.example must stay committed");
});

test("the README documents setup, scripts, structure and deployment", () => {
  const readme = read("README.md");
  for (const heading of ["## Stack", "## Setup", "## Scripts", "## Project structure", "## Deploying"]) {
    assert.ok(readme.includes(heading), `README is missing ${heading}`);
  }
  assert.ok(readme.includes("docs/DEPLOY_VERCEL.md"), "README must link the deploy guide");
});
