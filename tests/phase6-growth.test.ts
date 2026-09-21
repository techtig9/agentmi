import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { usageStatus, upgradePrompt, LOW_BALANCE_RATIO } from "../lib/pricing/entitlements";
import { PLANS, PLAN_ORDER } from "../lib/pricing/plans";
import { CHANGELOG } from "../lib/content/changelog";
import { PUBLIC_ROUTES } from "../lib/seo/site";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("usage is measured against the plan's real allowance", () => {
  const status = usageStatus("starter", 6000);
  assert.equal(status.allowance, PLANS.starter.creditsPerMonth);
  assert.equal(status.used, 0);
  assert.equal(status.percentUsed, 0);
  assert.equal(status.level, "healthy");
});

test("a healthy balance produces no prompt", () => {
  assert.equal(upgradePrompt(usageStatus("pro", PLANS.pro.creditsPerMonth)), null);
});

test("the low threshold and the prompt agree", () => {
  const allowance = PLANS.starter.creditsPerMonth;
  const justAbove = usageStatus("starter", Math.ceil(allowance * LOW_BALANCE_RATIO) + 1);
  const atThreshold = usageStatus("starter", Math.floor(allowance * LOW_BALANCE_RATIO));
  assert.equal(justAbove.level, "healthy");
  assert.equal(upgradePrompt(justAbove), null);
  assert.equal(atThreshold.level, "low");
  assert.equal(upgradePrompt(atThreshold)?.tone, "warning");
});

test("an exhausted balance is danger, never negative, and never over 100%", () => {
  const status = usageStatus("free", -250);
  assert.equal(status.level, "exhausted");
  assert.equal(status.remaining, 0, "a negative balance must not render as negative credits");
  assert.equal(status.percentUsed, 100);
  assert.equal(upgradePrompt(status)?.tone, "danger");
});

test("the prompt names the next plan up, and the top plan has none", () => {
  const starter = upgradePrompt(usageStatus("starter", 0));
  assert.match(starter!.message, new RegExp(PLANS.pro.name));

  const top = PLAN_ORDER[PLAN_ORDER.length - 1];
  const status = usageStatus(top, 0);
  assert.equal(status.nextPlan, null);
  assert.doesNotMatch(upgradePrompt(status)!.message, /raises it to/, "there is no higher plan to offer");
});

test("every plan can be summarised without throwing", () => {
  for (const id of PLAN_ORDER) {
    const status = usageStatus(id, 0);
    assert.ok(status.percentUsed >= 0 && status.percentUsed <= 100);
  }
});

test("pricing quotes both cycles through the billing engine, not hardcoded numbers", () => {
  const table = read("components/marketing/PricingTable.tsx");
  assert.match(table, /quotePrice/);
  assert.doesNotMatch(table, /\$\d+\s*\/\s*mo/, "a literal price would drift from the engine");
  assert.match(table, /role="radiogroup"/);
  assert.match(table, /aria-checked/);
});

test("robots disallows authenticated and diagnostic surfaces", () => {
  const robots = read("app/robots.ts");
  for (const path of ["/dashboard", "/admin", "/api/", "/setup"]) {
    assert.ok(robots.includes(`"${path}"`), `robots.txt must disallow ${path}`);
  }
});

test("the sitemap is generated from the route list, not hand-written", () => {
  assert.ok(PUBLIC_ROUTES.length > 0);
  const sitemap = read("app/sitemap.ts");
  assert.match(sitemap, /PUBLIC_ROUTES/);
  // Nothing behind auth may be advertised as indexable.
  for (const route of PUBLIC_ROUTES) {
    assert.doesNotMatch(route.path, /^\/(dashboard|admin|api|setup|onboarding)/);
  }
});

test("structured data is generated from the plan config", () => {
  const sd = read("components/marketing/StructuredData.tsx");
  assert.match(sd, /PLAN_ORDER/, "offers must come from the plans config");
  assert.match(sd, /FAQPage/);
  assert.match(sd, /SoftwareApplication/);
  assert.doesNotMatch(sd, /aggregateRating|reviewCount/, "no fabricated ratings");
});

test("the changelog carries no unshipped claims and is newest-first", () => {
  assert.ok(CHANGELOG.length >= 3);
  const dates = CHANGELOG.map((e) => new Date(e.date).getTime());
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a), "entries must be newest first");
  for (const entry of CHANGELOG) {
    assert.ok(entry.changes.length > 0, `${entry.version} has no changes listed`);
    assert.ok(!Number.isNaN(new Date(entry.date).getTime()), `${entry.version} has an invalid date`);
  }
});

test("the landing page makes no unverifiable social-proof claims", () => {
  // Strip comments first: prose about the implementation is not a claim made
  // to a visitor, and substring matching on it produces false positives
  // ("generated" contains "rated").
  const page = read("app/page.tsx")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .toLowerCase();

  for (const phrase of ["trusted by", "customers love", "\\brated\\b", "\\bawards?\\b", "testimonial", "\\d+\\+? companies"]) {
    assert.doesNotMatch(page, new RegExp(phrase), `unverifiable claim on the landing page: ${phrase}`);
  }
});
