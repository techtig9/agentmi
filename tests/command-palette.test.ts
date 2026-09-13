import test from "node:test";
import assert from "node:assert/strict";
import { filterCommands, type Command } from "../lib/navigation/commands";

const COMMANDS: Command[] = [
  { href: "/dashboard", label: "Dashboard", group: "BUILD" },
  { href: "/dashboard/agents", label: "Agents", group: "BUILD" },
  { href: "/dashboard/api", label: "API & SDK", group: "DEPLOY" },
  { href: "/dashboard/api-keys", label: "API Keys", group: "DEPLOY" },
  { href: "/dashboard/observability", label: "Observability", group: "QUALITY" },
  { href: "/dashboard/billing", label: "Billing", group: "WORKSPACE" },
];

test("an empty query returns every command in navigation order", () => {
  assert.deepEqual(
    filterCommands(COMMANDS, "").map((c) => c.href),
    COMMANDS.map((c) => c.href)
  );
  assert.deepEqual(filterCommands(COMMANDS, "   ").length, COMMANDS.length);
});

test("a prefix match outranks a mid-string match", () => {
  const results = filterCommands(COMMANDS, "api");
  assert.equal(results[0].label, "API & SDK");
  assert.equal(results[1].label, "API Keys");
});

test("subsequence matching finds the shorthand people actually type", () => {
  assert.equal(filterCommands(COMMANDS, "obs")[0].label, "Observability");
  assert.equal(filterCommands(COMMANDS, "apik")[0].label, "API Keys");
  // Non-contiguous letters, in order, still match.
  assert.equal(filterCommands(COMMANDS, "dshb")[0].label, "Dashboard");
});

test("matching is case-insensitive", () => {
  assert.equal(filterCommands(COMMANDS, "BILLING")[0].label, "Billing");
  assert.equal(filterCommands(COMMANDS, "bIlLiNg")[0].label, "Billing");
});

test("a group name matches when no label does", () => {
  const results = filterCommands(COMMANDS, "workspace");
  assert.equal(results.length, 1);
  assert.equal(results[0].label, "Billing");
});

test("a query matching nothing returns an empty list rather than everything", () => {
  assert.deepEqual(filterCommands(COMMANDS, "zzzzqx"), []);
});

test("ties preserve the original navigation ordering", () => {
  // Both are QUALITY/BUILD entries that match "a" as a subsequence; the
  // original relative order must be stable so the palette does not reshuffle.
  const results = filterCommands(COMMANDS, "a");
  const hrefs = results.map((c) => c.href);
  assert.ok(hrefs.indexOf("/dashboard/agents") < hrefs.indexOf("/dashboard/observability"));
});
