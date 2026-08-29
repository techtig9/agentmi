import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

test("Phase 1 dashboard keeps existing Agentmi routes and data model", () => {
  const sidebar = fs.readFileSync(path.join(root, "components/dashboard/Sidebar.tsx"), "utf8");
  const dashboard = fs.readFileSync(path.join(root, "app/(dashboard)/dashboard/page.tsx"), "utf8");
  const layout = fs.readFileSync(path.join(root, "app/(dashboard)/dashboard/layout.tsx"), "utf8");
  const orgContext = fs.readFileSync(path.join(root, "lib/data/org-context.ts"), "utf8");

  for (const route of ["/dashboard", "/dashboard/agents", "/dashboard/create", "/dashboard/workflows", "/dashboard/datasets", "/dashboard/api-keys", "/dashboard/webhooks", "/dashboard/billing", "/dashboard/team", "/dashboard/settings"]) {
    assert.ok(sidebar.includes(route), `sidebar should preserve ${route}`);
  }

  // agents/workflows/datasets are still queried directly on the dashboard
  // page itself (they're page-specific summaries).
  for (const table of ["agents", "workflows", "datasets"]) {
    assert.ok(dashboard.includes(`\"${table}\"`), `dashboard should read existing ${table} data`);
  }

  // credit_balances moved into the shared getOrgContext() helper so every
  // dashboard page reads it once instead of duplicating the query — verify
  // it's still read there, and that the layout still wires it into the
  // Topbar every /dashboard/* page renders, rather than asserting it's
  // inline on this specific page.
  assert.ok(orgContext.includes(`\"credit_balances\"`), "org context helper should read existing credit_balances data");
  assert.ok(layout.includes("ctx.creditBalance"), "dashboard layout must preserve existing credit data on every page");

  assert.ok(dashboard.includes("ctx.orgId"), "dashboard must remain organization scoped");
});
