import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { estimateCostUsd, formatCostUsd, totalCostUsd, MODEL_RATES, rateKey } from "../lib/pricing/model-costs";
import { providerOf, modelOf } from "../lib/chat/provider-of";
import { providerUsage } from "../lib/data/run-metrics";

const root = new URL("..", import.meta.url).pathname;

test("a priced model converts token usage into a real cost", () => {
  const cost = estimateCostUsd("groq", "llama-3.3-70b-versatile", {
    input_tokens: 1_000_000,
    output_tokens: 1_000_000,
  });
  const rate = MODEL_RATES[rateKey("groq", "llama-3.3-70b-versatile")];
  assert.equal(cost, rate.inputPerMillion + rate.outputPerMillion);
});

test("an unpriced model reports null, never zero", () => {
  // This is the whole point: "$0.0000" was displayed for every run in the
  // product because unknown was written as zero.
  assert.equal(estimateCostUsd("groq", "some-unlisted-model", { input_tokens: 5000 }), null);
  assert.equal(estimateCostUsd(null, null, { input_tokens: 5000 }), null);
  assert.equal(estimateCostUsd("groq", undefined, { input_tokens: 1 }), null);
});

test("a priced model with genuinely no tokens is zero, not unknown", () => {
  assert.equal(estimateCostUsd("groq", "llama-3.3-70b-versatile", { input_tokens: 0, output_tokens: 0 }), 0);
});

test("negative or missing token counts cannot produce a negative cost", () => {
  assert.equal(estimateCostUsd("groq", "llama-3.3-70b-versatile", { input_tokens: -5000 }), 0);
  assert.equal(estimateCostUsd("groq", "llama-3.3-70b-versatile", undefined), 0);
});

test("rate lookup is case-insensitive", () => {
  assert.equal(
    estimateCostUsd("GROQ", "Llama-3.3-70B-Versatile", { input_tokens: 1_000_000 }),
    estimateCostUsd("groq", "llama-3.3-70b-versatile", { input_tokens: 1_000_000 })
  );
});

test("formatting distinguishes unknown, zero and sub-cent costs", () => {
  assert.equal(formatCostUsd(null), "—");
  assert.equal(formatCostUsd(undefined), "—");
  assert.equal(formatCostUsd(0), "$0.0000");
  assert.equal(formatCostUsd(0.00001), "<$0.0001");
  assert.equal(formatCostUsd(0.0042), "$0.0042");
});

test("totals exclude unknowns rather than counting them as free", () => {
  const result = totalCostUsd([0.001, null, 0.002, undefined]);
  assert.equal(result.total, 0.003);
  assert.equal(result.priced, 2);
  assert.equal(result.unpriced, 2, "unpriced runs must be reported, not silently dropped");
});

test("every configured rate is positive and complete", () => {
  for (const [key, rate] of Object.entries(MODEL_RATES)) {
    assert.ok(rate.inputPerMillion > 0, `${key} has a non-positive input rate`);
    assert.ok(rate.outputPerMillion > 0, `${key} has a non-positive output rate`);
    assert.match(key, /^[a-z0-9_.-]+:.+$/, `${key} is not provider:model in lower case`);
  }
});

test("the provider/model identifier splits correctly", () => {
  assert.equal(providerOf("groq:llama-3.3-70b-versatile"), "groq");
  assert.equal(modelOf("groq:llama-3.3-70b-versatile"), "llama-3.3-70b-versatile");
  // OpenRouter model ids contain a slash, and some contain colons.
  assert.equal(providerOf("openrouter:openai/gpt-4o-mini"), "openrouter");
  assert.equal(modelOf("openrouter:meta/llama:free"), "meta/llama:free");
  assert.equal(providerOf("bare"), "bare", "a value with no separator is the provider");
});

test("no run trace hardcodes a provider name", () => {
  // Traces used to record provider: "anthropic" regardless of which provider
  // actually served the request, so the analytics breakdown attributed every
  // run to a provider that may never have been called.
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") {
        const src = readFileSync(full, "utf8");
        if (/step:\s*"model"[^}]*provider:\s*"[a-z]/i.test(src)) offenders.push(full.replace(root, ""));
      }
    }
  };
  walk(join(root, "app", "api"));
  assert.deepEqual(offenders, [], "the provider must be derived from the result, not written literally");
});

test("no route records a literal zero cost", () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "route.ts") {
        if (/costUsd:\s*0\b/.test(readFileSync(full, "utf8"))) offenders.push(full.replace(root, ""));
      }
    }
  };
  walk(join(root, "app", "api"));
  assert.deepEqual(offenders, []);
});

test("the provider breakdown reads the trace the routes now write", () => {
  const usage = providerUsage([
    { trace: [{ step: "model", provider: "groq", model: "llama-3.3-70b-versatile" }] },
    { trace: [{ step: "model", provider: "groq", model: "llama-3.3-70b-versatile" }] },
    { trace: [{ step: "model", provider: "cerebras", model: "llama-3.3-70b" }] },
  ]);
  assert.deepEqual(usage, [
    { label: "groq", count: 2 },
    { label: "cerebras", count: 1 },
  ]);
});

test("the cost column can hold an unknown value", () => {
  const sql = readFileSync(join(root, "supabase/phase10_run_costs.sql"), "utf8");
  assert.match(sql, /drop not null/i, "a NOT NULL cost column cannot represent 'unpriced'");
  assert.match(sql, /do \$\$/i, "the migration must be re-runnable");
});
