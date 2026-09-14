import test from "node:test";
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

const tsxFiles = [
  ...walk(path.join(root, "app"), [".tsx"]),
  ...walk(path.join(root, "components"), [".tsx"]),
];

/**
 * The exact decorative characters the design spec bans as stand-ins for icons.
 *
 * `⌘` is deliberately absent: it is the real Command-key symbol and belongs in
 * a <kbd>. `→` is absent too — it is legitimate typography inside prose such as
 * "input → model → output". What this catches is a glyph doing an icon's job.
 */
const BANNED_ICON_GLYPHS = ["⌂", "◈", "↗", "◇", "⚙", "▦", "▤", "≡", "✓", "✗", "◉", "▣", "◎", "◫", "◒", "☰", "∞"];

test("no raw text glyphs are used in place of icons", () => {
  const offenders: string[] = [];
  for (const file of tsxFiles) {
    const content = fs.readFileSync(file, "utf8");
    const found = BANNED_ICON_GLYPHS.filter((glyph) => content.includes(glyph));
    if (found.length) offenders.push(`${path.relative(root, file)} (${found.join(" ")})`);
  }
  assert.deepEqual(offenders, [], `raw icon glyphs found — use a lucide-react icon instead: ${offenders.join(", ")}`);
});

test("icon-only controls carry an accessible name", () => {
  // An <IconButton> without a label, or a bare <button> whose only child is an
  // icon and which has no aria-label, is invisible to a screen reader.
  const iconButton = fs.readFileSync(path.join(root, "components/ui/Button.tsx"), "utf8");
  assert.ok(
    /label:\s*string;/.test(iconButton),
    "IconButton must require a `label` prop so an icon-only control always has an accessible name"
  );
});

test("the sidebar exposes every spec'd navigation group", () => {
  const sidebar = fs.readFileSync(path.join(root, "components/dashboard/Sidebar.tsx"), "utf8");
  for (const group of ["BUILD", "QUALITY", "DEPLOY", "MANAGE", "ECOSYSTEM", "WORKSPACE"]) {
    assert.ok(sidebar.includes(`label: "${group}"`), `sidebar must keep the ${group} navigation group`);
  }
});

test("every sidebar entry ships a real icon component, not a string", () => {
  const sidebar = fs.readFileSync(path.join(root, "components/dashboard/Sidebar.tsx"), "utf8");
  const entries = [...sidebar.matchAll(/\["(\/dashboard[a-z0-9/-]*)",\s*"([^"]+)",\s*([A-Z][A-Za-z0-9]*)\]/g)];
  assert.ok(entries.length >= 28, `expected the full navigation set, found ${entries.length}`);
  for (const [, href, , icon] of entries) {
    assert.ok(/^[A-Z]/.test(icon), `${href} must map to an imported icon component, got ${icon}`);
    assert.ok(
      new RegExp(`\\b${icon}\\b`).test(sidebar.split("export const NAV_GROUPS")[0]),
      `${icon} must be imported at the top of Sidebar.tsx`
    );
  }
});

test("design tokens define the spec's accent palette and semantic aliases", () => {
  const config = fs.readFileSync(path.join(root, "tailwind.config.ts"), "utf8");
  for (const hex of ["#00F0FF", "#B026FF", "#39FF14", "#FF2E9A"]) {
    assert.ok(config.includes(hex), `design token ${hex} must remain defined`);
  }
  for (const token of ["surface", "elevated", "accent", "canvas", "panel"]) {
    assert.ok(config.includes(`${token}:`), `semantic token \`${token}\` must be defined`);
  }
});

test("a global focus-visible ring and skip link exist", () => {
  const css = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
  assert.ok(css.includes("focus-visible"), "a global :focus-visible ring must be defined");
  assert.ok(css.includes(".skip-link"), "a skip-to-content link style must be defined");
  assert.ok(css.includes("prefers-reduced-motion"), "reduced-motion support must be preserved");
});

test("the dashboard shell renders a skip link and a labelled main landmark", () => {
  const shell = fs.readFileSync(path.join(root, "components/dashboard/DashboardShell.tsx"), "utf8");
  assert.ok(shell.includes('href="#main-content"'), "shell must render a skip-to-content link");
  assert.ok(shell.includes('id="main-content"'), "shell must render a <main> with the matching id");
  assert.ok(shell.includes("useFocusTrap"), "the mobile navigation drawer must trap focus while open");
});

test("dashboard count metrics read `count`, never `data.length` from a head query", () => {
  // Regression guard: a `{ count: 'exact', head: true }` query returns
  // `data: null`, so reading `.length` off it silently renders 0 forever.
  const page = fs.readFileSync(path.join(root, "app/(dashboard)/dashboard/page.tsx"), "utf8");
  assert.ok(page.includes("count: workflowCount"), "workflow metric must destructure `count`");
  assert.ok(page.includes("count: datasetCount"), "dataset metric must destructure `count`");
  assert.ok(
    !/(workflows|datasets)\?\.length/.test(page),
    "metric cards must not read .length off a head:true query result"
  );
});
