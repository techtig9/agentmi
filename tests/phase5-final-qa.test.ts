import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DOC_SECTIONS, searchDocs } from "../lib/docs/content";
import { templateRequirements, templatePrompt, categoryLabel } from "../lib/templates/describe";

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

const TSX_FILES = [...walk(path.join(root, "app"), ".tsx"), ...walk(path.join(root, "components"), ".tsx")];

/** Strips comments so a guard tests shipped output, not commentary about it. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.split("//")[0])
    .join("\n");
}

// ---------------------------------------------------------------------------
// Final code-quality audit
// ---------------------------------------------------------------------------

test("no component references a CSS class the stylesheet never defines", () => {
  /*
   * This bug appeared three separate times — `.input` on the integrations form
   * and again on the secrets form, `.neon-input` and `.neon-button` on the
   * marketplace publish form. An undefined class is silent: the element simply
   * renders unstyled, with no error anywhere.
   */
  const css = read("app/globals.css");
  const definedClasses = new Set(
    [...css.matchAll(/^\s*\.([a-zA-Z][\w-]*)/gm)].map((match) => match[1])
  );

  // Every class that is neither a Tailwind utility nor defined in globals.css.
  const bespoke = ["input", "neon-input", "neon-button", "card-glow", "panel"];
  const offenders: string[] = [];

  for (const file of TSX_FILES) {
    const source = stripComments(fs.readFileSync(file, "utf8"));
    for (const className of bespoke) {
      if (definedClasses.has(className)) continue;
      if (new RegExp(`className="${className}"`).test(source)) {
        offenders.push(`${path.relative(root, file)}: .${className}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `undefined CSS classes render unstyled: ${offenders.join(", ")}`);
});

test("no fake-feature markers survive anywhere", () => {
  const offenders: string[] = [];
  const files = [
    ...TSX_FILES,
    ...walk(path.join(root, "lib"), ".ts"),
    ...walk(path.join(root, "app"), ".ts"),
  ];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    if (/\bTODO\b|\bFIXME\b|coming soon|lorem ipsum/i.test(source)) {
      offenders.push(path.relative(root, file));
    }
  }
  assert.deepEqual(offenders, [], `fake-feature markers found in: ${offenders.join(", ")}`);
});

test("every interactive icon-only control has an accessible name", () => {
  /*
   * An icon-only button with no aria-label is a blank control to a screen
   * reader. IconButton enforces this at the type level; this catches raw
   * <button> elements whose only child is an icon.
   */
  const offenders: string[] = [];
  for (const file of TSX_FILES) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/<button\b[^>]*>\s*<[A-Z]\w+\s+size=\{\d+\}[^>]*\/>\s*<\/button>/g)) {
      const tag = match[0];
      if (!/aria-label=/.test(tag) && !/title=/.test(tag)) {
        offenders.push(`${path.relative(root, file)}: ${tag.slice(0, 70)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `icon-only buttons without a name: ${offenders.join(" | ")}`);
});

test("decorative icons are hidden from assistive technology", () => {
  // A lucide icon beside a visible text label is decoration; announcing its
  // name duplicates the label. Sample the components that render the most.
  for (const file of [
    "components/dashboard/Sidebar.tsx",
    "components/ui/Badge.tsx",
    "components/ui/Button.tsx",
  ]) {
    const source = read(file);
    const icons = (source.match(/<[A-Z]\w+\s+size=\{\d+\}/g) ?? []).length;
    const hidden = (source.match(/aria-hidden="true"/g) ?? []).length;
    assert.ok(
      hidden >= icons - 1,
      `${file} renders ${icons} icons but hides only ${hidden} from screen readers`
    );
  }
});

// ---------------------------------------------------------------------------
// Loading, empty and error states
// ---------------------------------------------------------------------------

test("the dashboard segment has both a loading and an error boundary", () => {
  // Without loading.tsx, an async server component renders nothing at all until
  // its data resolves — a blank panel that reads as broken, not loading.
  const loading = read("app/(dashboard)/dashboard/loading.tsx");
  assert.ok(loading.includes('role="status"'), "the loading state must be announced");
  assert.ok(loading.includes("Skeleton"), "it should mirror the page's real shape");

  const error = read("app/(dashboard)/dashboard/error.tsx");
  assert.ok(error.includes("reset()"), "the error boundary must offer a retry");
  assert.ok(
    error.includes("error.digest"),
    "a reference id lets a user quote something useful without exposing a stack trace"
  );
});

test("empty states explain and offer a way forward, never a bare 'no data'", () => {
  const states = read("components/ui/States.tsx");
  assert.ok(states.includes("description"), "EmptyState must carry an explanation");
  assert.ok(states.includes("action"), "EmptyState must be able to carry a CTA");

  // Spot-check that the main list screens actually use it.
  for (const page of [
    "app/(dashboard)/dashboard/runs/page.tsx",
    "app/(dashboard)/dashboard/webhooks/page.tsx",
    "app/(dashboard)/dashboard/secrets/page.tsx",
    "app/(dashboard)/dashboard/support/page.tsx",
  ]) {
    assert.ok(read(page).includes("EmptyState"), `${page} must use a real empty state`);
  }
});

// ---------------------------------------------------------------------------
// Ecosystem
// ---------------------------------------------------------------------------

test("template requirements are derived from the template's own config", () => {
  const knowledgeBound = templateRequirements({
    system_prompt_template: "Answer using only the provided knowledge base.",
    tools: ["knowledge_base_search"],
    escalation_enabled: true,
  });
  assert.ok(knowledgeBound.some((r) => r.label === "Knowledge required"));
  assert.ok(knowledgeBound.some((r) => r.label === "Escalation enabled"));

  const plain = templateRequirements({ system_prompt_template: "You are a friendly assistant." });
  assert.deepEqual(plain.map((r) => r.label), ["No setup required"]);
});

test("template helpers tolerate missing or malformed config", () => {
  for (const config of [null, undefined, "nonsense", 42, []]) {
    assert.ok(Array.isArray(templateRequirements(config)));
    assert.equal(templatePrompt(config), null);
  }
});

test("category labels are humanised from the stored value", () => {
  assert.equal(categoryLabel("customer_support"), "Customer Support");
  assert.equal(categoryLabel("sales_qualifier"), "Sales Qualifier");
  assert.equal(categoryLabel("data-ml"), "Data Ml");
});

test("the template gallery builds categories from real data, not a fixed list", () => {
  const gallery = read("components/dashboard/TemplateGallery.tsx");
  assert.ok(
    gallery.includes("const categories = useMemo"),
    "categories must be derived from the templates that exist"
  );
  // A hardcoded eight-category list would leave five filters permanently empty.
  for (const invented of ["Marketing", "HR", "Operations"]) {
    assert.ok(
      !new RegExp(`"${invented}"`).test(stripComments(gallery)),
      `${invented} must not be hardcoded as a category that has no templates`
    );
  }
});

test("the marketplace shows real installs and never invents popularity", () => {
  const browser = read("components/dashboard/MarketplaceBrowser.tsx");
  assert.ok(browser.includes("installs"), "the real install count must be shown");
  const shipped = stripComments(browser);
  for (const fabricated of ["rating", "downloads", "stars", "reviews"]) {
    assert.ok(
      !new RegExp(`\\b${fabricated}\\b`, "i").test(shipped),
      `the marketplace must not display a ${fabricated} figure the platform does not collect`
    );
  }
});

// ---------------------------------------------------------------------------
// Documentation
// ---------------------------------------------------------------------------

test("documentation covers every section the product ships", () => {
  const required = [
    "getting-started",
    "agents",
    "knowledge",
    "tools",
    "workflows",
    "evaluations",
    "deployments",
    "api",
    "webhooks",
    "security",
    "billing",
  ];
  const present = DOC_SECTIONS.map((section) => section.id);
  for (const id of required) {
    assert.ok(present.includes(id), `documentation is missing the ${id} section`);
  }
});

test("every documentation section links to a route that exists", () => {
  for (const section of DOC_SECTIONS) {
    const route = section.href.replace("/dashboard", "dashboard");
    const page = path.join(root, "app/(dashboard)", route, "page.tsx");
    assert.ok(
      fs.existsSync(page),
      `${section.id} links to ${section.href}, which has no page.tsx`
    );
  }
});

test("documentation search matches titles, summaries and body points", () => {
  assert.equal(searchDocs(DOC_SECTIONS, "").length, DOC_SECTIONS.length);
  assert.equal(searchDocs(DOC_SECTIONS, "   ").length, DOC_SECTIONS.length);

  const rls = searchDocs(DOC_SECTIONS, "row-level security");
  assert.ok(rls.some((s) => s.id === "security"), "a body-text match must be found");

  const ssrf = searchDocs(DOC_SECTIONS, "SSRF");
  assert.ok(ssrf.some((s) => s.id === "tools"), "search must be case-insensitive");

  assert.deepEqual(searchDocs(DOC_SECTIONS, "zzzznotathing"), []);
});

test("every documentation section carries real substance", () => {
  for (const section of DOC_SECTIONS) {
    assert.ok(section.summary.length > 10, `${section.id} needs a real summary`);
    assert.ok(section.points.length >= 3, `${section.id} needs at least three points`);
    for (const point of section.points) {
      assert.ok(point.length > 30, `${section.id} has a point too short to be useful: "${point}"`);
    }
  }
});

// ---------------------------------------------------------------------------
// Final functional audit
// ---------------------------------------------------------------------------

test("every sidebar route resolves to a page", () => {
  const sidebar = read("components/dashboard/Sidebar.tsx");
  const routes = [...sidebar.matchAll(/\["(\/dashboard[a-z0-9/-]*)"/g)].map((m) => m[1]);
  assert.ok(routes.length >= 28, `expected the full navigation set, found ${routes.length}`);

  const missing = routes.filter(
    (route) =>
      !fs.existsSync(path.join(root, "app/(dashboard)", route.replace("/dashboard", "dashboard"), "page.tsx"))
  );
  assert.deepEqual(missing, [], `sidebar links with no page: ${missing.join(", ")}`);
});

test("no internal navigation uses a raw anchor where it needs the client router", () => {
  /*
   * A raw <a href="/dashboard/..."> triggers a full document reload, throwing
   * away the client router and re-running the whole auth round trip. Anchors to
   * a query string on the current page are fine — they are real navigations.
   */
  const offenders: string[] = [];
  for (const file of TSX_FILES) {
    const source = stripComments(fs.readFileSync(file, "utf8"));
    for (const match of source.matchAll(/<a\s+[^>]*href="(\/dashboard[^"?#]*)"/g)) {
      offenders.push(`${path.relative(root, file)}: ${match[1]}`);
    }
  }
  assert.deepEqual(offenders, [], `use next/link for internal navigation: ${offenders.join(", ")}`);
});

test("reduced-motion support survives to the end", () => {
  const css = read("app/globals.css");
  assert.ok(css.includes("prefers-reduced-motion"), "the global reduced-motion rule must remain");
  // Spinners and pulses opt out individually too, since they animate forever.
  const button = read("components/ui/Button.tsx");
  assert.ok(button.includes("motion-reduce:animate-none"), "the spinner must respect reduced motion");
});

test("animation durations stay inside the 150-300ms band", () => {
  const config = read("tailwind.config.ts");
  const durations = [...config.matchAll(/(\d+)ms ease-out/g)].map((m) => Number(m[1]));
  assert.ok(durations.length > 0, "sanity check: the config defines keyframe animations");
  for (const duration of durations) {
    assert.ok(
      duration >= 150 && duration <= 300,
      `${duration}ms falls outside the 150-300ms interaction band`
    );
  }
});
