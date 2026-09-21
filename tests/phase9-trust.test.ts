import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { LEGAL_DOCUMENTS, legalDocument } from "../lib/content/legal";
import { welcomeEmail, verifyEmail, receiptEmail, trialEndingEmail, paymentFailedEmail, __testables } from "../lib/email/templates";
import { isEmailConfigured, sendEmail } from "../lib/email/send";
import { planEconomics, allPlanEconomics, plansAtRisk, DEFAULT_ASSUMPTIONS } from "../lib/pricing/unit-economics";
import { PLANS } from "../lib/pricing/plans";
import { LEGAL_SLUGS, PUBLIC_ROUTES } from "../lib/seo/site";

const root = new URL("..", import.meta.url).pathname;
const read = (p: string) => readFileSync(join(root, p), "utf8");

// --------------------------------------------------------------------------
// Legal
// --------------------------------------------------------------------------

test("every required legal document exists and is reachable", () => {
  for (const slug of ["privacy", "terms", "refund", "cookies", "subprocessors", "ai-disclosure"]) {
    const doc = legalDocument(slug);
    assert.ok(doc, `missing legal document: ${slug}`);
    assert.ok(doc!.sections.length >= 3, `${slug} is too thin to be useful`);
    for (const section of doc!.sections) {
      assert.ok(section.body.length > 0, `${slug} > ${section.heading} is empty`);
    }
  }
});

test("legal pages are published in the sitemap", () => {
  for (const slug of LEGAL_SLUGS) {
    assert.ok(
      PUBLIC_ROUTES.some((route) => route.path === `/legal/${slug}`),
      `/legal/${slug} is not in the sitemap`
    );
  }
});

test("every legal page is marked as an unreviewed draft", () => {
  // The notice is rendered by the shared route, so no document can ship
  // looking like a reviewed, binding agreement.
  const page = read("app/legal/[slug]/page.tsx");
  assert.match(page, /pending legal review/i);
  assert.match(page, /role="note"/);
});

test("a cookie policy exists because the product stores things in the browser", () => {
  const cookies = legalDocument("cookies")!;
  const text = JSON.stringify(cookies).toLowerCase();
  assert.match(text, /local storage|localstorage/, "the theme preference must be disclosed");
  assert.match(text, /authentication/, "the auth cookie must be disclosed");
});

test("the subprocessor list names the providers the runtime actually calls", () => {
  const text = JSON.stringify(legalDocument("subprocessors")).toLowerCase();
  for (const provider of ["supabase", "groq", "cerebras", "openrouter", "voyage", "paddle"]) {
    assert.match(text, new RegExp(provider), `subprocessor list omits ${provider}`);
  }
});

test("the AI disclosure states that customer content is not used for training", () => {
  const text = JSON.stringify(legalDocument("ai-disclosure")).toLowerCase();
  assert.match(text, /does not train/);
});

test("legal slugs are unique", () => {
  const slugs = LEGAL_DOCUMENTS.map((d) => d.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

// --------------------------------------------------------------------------
// Email
// --------------------------------------------------------------------------

test("every template produces a subject, a text part and an HTML part", () => {
  const appUrl = "https://agentmi.example";
  const emails = [
    welcomeEmail({ name: "Sam", appUrl }),
    verifyEmail({ verifyUrl: `${appUrl}/verify?token=abc` }),
    receiptEmail({ planName: "Pro", amount: "$39.00", periodEnd: "1 October 2026", appUrl }),
    trialEndingEmail({ daysLeft: 3, appUrl }),
    paymentFailedEmail({ appUrl }),
  ];
  for (const email of emails) {
    assert.ok(email.subject.length > 0 && email.subject.length < 120, `bad subject: ${email.subject}`);
    // A missing text part scores worse with spam filters and renders empty in
    // clients that do not display HTML.
    assert.ok(email.text.trim().length > 0, "missing plain-text part");
    assert.ok(email.html.includes("<"), "missing HTML part");
  }
});

test("interpolated values are HTML-escaped", () => {
  const email = welcomeEmail({ name: '<img src=x onerror="alert(1)">', appUrl: "https://a.test" });
  assert.doesNotMatch(email.html, /<img/, "a name must not be able to inject markup");
  assert.match(email.html, /&lt;img/);
  assert.equal(__testables.escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
});

test("the trial email reads correctly in the singular", () => {
  assert.match(trialEndingEmail({ daysLeft: 1, appUrl: "https://a.test" }).subject, /tomorrow/);
  assert.match(trialEndingEmail({ daysLeft: 5, appUrl: "https://a.test" }).subject, /5 days/);
});

test("sending is skipped, not attempted or thrown, when unconfigured", async () => {
  const priorKey = process.env.RESEND_API_KEY;
  const priorFrom = process.env.EMAIL_FROM;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  try {
    assert.equal(isEmailConfigured(), false);
    const result = await sendEmail("someone@example.test", welcomeEmail({ appUrl: "https://a.test" }));
    assert.deepEqual(result, { status: "skipped", reason: "not_configured" });
  } finally {
    if (priorKey !== undefined) process.env.RESEND_API_KEY = priorKey;
    if (priorFrom !== undefined) process.env.EMAIL_FROM = priorFrom;
  }
});

// --------------------------------------------------------------------------
// Unit economics
// --------------------------------------------------------------------------

test("margin is derived from the real plan and credit configuration", () => {
  const pro = planEconomics("pro");
  assert.equal(pro.monthlyPriceUsd, PLANS.pro.price.monthly / 100);
  assert.equal(pro.creditsPerMonth, PLANS.pro.creditsPerMonth);
  // ai_message costs 2 credits, so the allowance buys half its number in calls.
  assert.equal(pro.messagesPerAllowance, PLANS.pro.creditsPerMonth / 2);
  assert.equal(pro.grossMarginUsd, Math.round((pro.monthlyPriceUsd - pro.worstCaseProviderCostUsd) * 10_000) / 10_000);
});

test("a free plan reports cost without a meaningless margin percentage", () => {
  const free = planEconomics("free");
  assert.equal(free.monthlyPriceUsd, 0);
  assert.equal(free.grossMarginPct, null, "percentage margin on a zero price is not meaningful");
  assert.equal(free.negativeMargin, false, "a free plan is acquisition cost, not a negative-margin product");
  assert.ok(free.worstCaseProviderCostUsd > 0, "a free signup still costs us something");
});

test("no plan is loss-making on the default provider", () => {
  assert.deepEqual(plansAtRisk().map((p) => p.planName), [], "a plan on the default provider loses money");
});

test("an expensive provider is detected as loss-making", () => {
  // This is the guard the unit-economics document exists for: the fallback
  // chain can route to a model that inverts margin.
  const risky = plansAtRisk({ ...DEFAULT_ASSUMPTIONS, provider: "openrouter", model: "openai/gpt-4o" });
  assert.ok(risky.length > 0, "gpt-4o rates must be flagged as negative margin");
});

test("an unpriced model does not silently report full margin", () => {
  const plan = planEconomics("pro", { ...DEFAULT_ASSUMPTIONS, provider: "unknown", model: "unknown" });
  assert.equal(plan.worstCaseProviderCostUsd, 0);
  // Documented limitation: with no rate the cost is unknown, so margin reads
  // as 100%. The report must therefore state which model it priced.
  assert.equal(plan.grossMarginPct, 100);
});

test("the economics document and its generator both exist", () => {
  assert.ok(existsSync(join(root, "docs/UNIT_ECONOMICS.md")));
  assert.ok(existsSync(join(root, "scripts/unit-economics.ts")));
  const doc = read("docs/UNIT_ECONOMICS.md");
  for (const plan of allPlanEconomics()) {
    assert.ok(doc.includes(plan.planName), `the document omits the ${plan.planName} plan`);
  }
  assert.match(doc, /Recommended actions/);
});
