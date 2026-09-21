import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveTheme } from "../components/ui/ThemeToggle";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("system preference resolves to the OS setting; explicit choices win", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light", "an explicit choice must override the OS");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("both themes define every token", () => {
  const css = read("app/globals.css");
  const light = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
  const dark = css.slice(css.indexOf(".dark {"));
  const names = (block: string) => new Set(block.match(/--[a-z-]+(?=:)/g) ?? []);
  const l = names(light);
  const d = names(dark);
  assert.ok(l.size >= 14, "expected a full token set in :root");
  const missing = [...l].filter((n) => !d.has(n));
  assert.deepEqual(missing, [], "a token defined only in light mode breaks dark mode");
});

test("colour tokens are channel triplets so opacity modifiers keep working", () => {
  // `bg-accent/10` compiles only when the variable holds "R G B", not a hex.
  const css = read("app/globals.css");
  const decls = css.match(/--(?:canvas|surface|accent|content|hairline):[^;]+;/g) ?? [];
  assert.ok(decls.length > 0);
  for (const decl of decls) {
    assert.match(decl, /:\s*\d{1,3} \d{1,3} \d{1,3};/, `not a channel triplet: ${decl}`);
  }
});

test("tailwind maps colours through the variables, not hard-coded hexes", () => {
  const config = read("tailwind.config.ts");
  assert.match(config, /darkMode: "class"/);
  const colours = config.slice(config.indexOf("colors: {"), config.indexOf("fontFamily:"));
  assert.doesNotMatch(colours, /#[0-9A-Fa-f]{6}/, "a literal hex here cannot theme");
});

test("the theme is applied before paint to avoid a flash", () => {
  const script = read("components/ui/ThemeScript.tsx");
  assert.match(script, /dangerouslySetInnerHTML/, "must be inline and synchronous");
  assert.match(script, /try\s*\{/, "localStorage throws in some privacy modes");
  const layout = read("app/layout.tsx");
  assert.match(layout, /<ThemeScript \/>/);
  assert.match(layout, /suppressHydrationWarning/);
});

test("the node graph is theme-aware and animates only compositable properties", () => {
  const svg = read("components/marketing/NodeGraph.tsx");
  assert.doesNotMatch(svg, /#[0-9A-Fa-f]{6}/, "hard-coded colour would not follow the theme");
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-labelledby/);
  assert.match(svg, /<title/);
});

test("the boot script embeds the real storage key, not a client-reference proxy", async () => {
  // This shipped broken. THEME_STORAGE_KEY was imported from a "use client"
  // module into a server component, so it was a client-reference proxy and
  // JSON.stringify produced `{}`. The rendered script read
  // `localStorage.getItem({})`, meaning the saved preference was never read
  // and every page load fell back to the OS setting.
  const { THEME_STORAGE_KEY } = await import("../lib/theme/storage");
  assert.equal(typeof THEME_STORAGE_KEY, "string");
  assert.ok(THEME_STORAGE_KEY.length > 0);

  const storage = read("lib/theme/storage.ts");
  assert.doesNotMatch(storage, /^\s*["']use client["']/m, "the key module must not be client-only");

  const script = read("components/ui/ThemeScript.tsx");
  assert.match(script, /from "@\/lib\/theme\/storage"/, "must not import the key from a client module");
});

test("the toggle and the boot script agree on the storage key", async () => {
  const { THEME_STORAGE_KEY } = await import("../lib/theme/storage");
  const toggle = read("components/ui/ThemeToggle.tsx");
  assert.match(toggle, /from "@\/lib\/theme\/storage"/, "both must read one definition");
  // A key written twice is a key that can drift.
  assert.doesNotMatch(toggle, new RegExp(`=\\s*["']${THEME_STORAGE_KEY}["']`), "the key must not be redefined here");
});
