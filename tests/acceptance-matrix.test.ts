import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.cwd());

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, exts));
    else if (exts.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

const appFiles = [...walk(path.join(root, "app"), [".ts", ".tsx"]), ...walk(path.join(root, "components"), [".ts", ".tsx"]), ...walk(path.join(root, "lib"), [".ts", ".tsx"])];

test("no fake-feature markers (TODO/FIXME/COMING SOON) anywhere in the app", () => {
  const offenders: string[] = [];
  for (const f of appFiles) {
    const content = fs.readFileSync(f, "utf8");
    if (/TODO|FIXME|COMING SOON/i.test(content)) offenders.push(path.relative(root, f));
  }
  assert.deepEqual(offenders, [], `found fake-feature markers in: ${offenders.join(", ")}`);
});

test("no dead href=\"#\" links anywhere in the app", () => {
  const offenders: string[] = [];
  for (const f of appFiles.filter((f) => f.endsWith(".tsx"))) {
    if (fs.readFileSync(f, "utf8").includes('href="#"')) offenders.push(path.relative(root, f));
  }
  assert.deepEqual(offenders, [], `found dead links in: ${offenders.join(", ")}`);
});

test("no raw Tailwind palette colors bypass the design token system", () => {
  const rawColorPattern = /\b(bg|text|border)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|emerald|teal|sky|blue|indigo|purple|fuchsia|rose|white|black)-\d+/;
  const offenders: string[] = [];
  for (const f of appFiles.filter((f) => f.endsWith(".tsx"))) {
    if (rawColorPattern.test(fs.readFileSync(f, "utf8"))) offenders.push(path.relative(root, f));
  }
  assert.deepEqual(offenders, [], `found raw palette colors bypassing tokens in: ${offenders.join(", ")}`);
});

test("no explicit `any` type usage anywhere in the app", () => {
  // Matches actual TypeScript any usage, not the word "any" appearing in
  // prose/comments (e.g. "any other agent conversation").
  const anyTypePattern = /:\s*any\b|<any>|as\s+any\b/;
  const offenders: string[] = [];
  for (const f of appFiles) {
    const withoutBlockComments = fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const line of withoutBlockComments.split("\n")) {
      const codeOnly = line.split("//")[0];
      if (anyTypePattern.test(codeOnly)) {
        offenders.push(`${path.relative(root, f)}: ${line.trim()}`);
        break;
      }
    }
  }
  assert.deepEqual(offenders, [], `found explicit any usage in: ${offenders.join(" | ")}`);
});

test("every chat-capable API route records observability via recordAgentRun", () => {
  const chatRoutes = [
    "app/api/v1/agents/[id]/chat/route.ts",
    "app/api/v1/deployments/[id]/run/route.ts",
    "app/api/v1/workflows/[id]/chat/route.ts",
    "app/api/widget/[publicWidgetId]/chat/route.ts",
    "app/api/dashboard/agents/[id]/chat/route.ts",
  ];
  for (const route of chatRoutes) {
    const content = fs.readFileSync(path.join(root, route), "utf8");
    assert.ok(content.includes("recordAgentRun"), `${route} must call recordAgentRun so its executions appear in Observability/Runs`);
  }
});

test("every route linked from the dashboard sidebar resolves to a real page", () => {
  const sidebarSource = fs.readFileSync(path.join(root, "components/dashboard/Sidebar.tsx"), "utf8");
  const routes = [...sidebarSource.matchAll(/\["(\/dashboard[a-z0-9/-]*)"/g)].map((m) => m[1]);
  assert.ok(routes.length > 10, "sanity check: should have found a substantial number of sidebar routes");
  const missing: string[] = [];
  for (const route of routes) {
    const pagePath = path.join(root, "app/(dashboard)", route.replace("/dashboard", "dashboard"), "page.tsx");
    if (!fs.existsSync(pagePath)) missing.push(route);
  }
  assert.deepEqual(missing, [], `sidebar links to routes with no corresponding page.tsx: ${missing.join(", ")}`);
});

test("next is pinned at or above the patched 14.2.x baseline that closed the known CVE", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const version = pkg.dependencies.next as string;
  const [, minor, patch] = version.split(".").map(Number);
  assert.equal(minor, 2, "must stay on the 14.2.x line unless a deliberate major-version migration is done");
  assert.ok(patch >= 35, `next patch version regressed below the CVE fix baseline (14.2.35): found ${version}`);
});

test("fonts are self-hosted, not fetched from Google Fonts at build time", () => {
  const layout = fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8");
  assert.ok(!/from\s+["']next\/font\/google["']/.test(layout), "must not reintroduce a build-time dependency on Google's font CDN");
  assert.ok(/from\s+["']next\/font\/local["']/.test(layout), "must use the self-hosted font files");
});
