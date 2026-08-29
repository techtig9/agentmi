import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEvalCases, MAX_EVAL_CASES } from "../lib/evaluations/parse-cases";
import { caseWasPassed, scorePercent } from "../lib/evaluations/score";

test("parseEvalCases parses well-formed lines", () => {
  const result = parseEvalCases("What's your refund policy? => 30 days\nDo you ship internationally? => yes");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.cases.length, 2);
    assert.deepEqual(result.cases[0], { input: "What's your refund policy?", expectedContains: "30 days" });
    assert.deepEqual(result.cases[1], { input: "Do you ship internationally?", expectedContains: "yes" });
  }
});

test("parseEvalCases ignores blank lines", () => {
  const result = parseEvalCases("a => b\n\n\nc => d");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.cases.length, 2);
});

test("parseEvalCases rejects empty input", () => {
  const result = parseEvalCases("   \n  ");
  assert.equal(result.ok, false);
});

test("parseEvalCases rejects a line missing the separator", () => {
  const result = parseEvalCases("a => b\njust some text with no separator");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /Line 2/);
});

test("parseEvalCases rejects a line with an empty input or expectation", () => {
  assert.equal(parseEvalCases(" => b").ok, false);
  assert.equal(parseEvalCases("a => ").ok, false);
});

test("parseEvalCases rejects more than the maximum number of cases", () => {
  const lines = Array.from({ length: MAX_EVAL_CASES + 1 }, (_, i) => `input ${i} => expected ${i}`).join("\n");
  const result = parseEvalCases(lines);
  assert.equal(result.ok, false);
});

test("caseWasPassed is a case-insensitive substring check", () => {
  assert.equal(caseWasPassed("Our policy allows a 30 Day return window.", "30 day"), true);
  assert.equal(caseWasPassed("We do not offer refunds.", "30 days"), false);
});

test("scorePercent computes the percentage of passed cases", () => {
  assert.equal(scorePercent([{ passed: true }, { passed: true }, { passed: false }, { passed: true }]), 75);
  assert.equal(scorePercent([{ passed: false }]), 0);
  assert.equal(scorePercent([{ passed: true }]), 100);
});

test("scorePercent returns 0 for an empty result set rather than NaN", () => {
  assert.equal(scorePercent([]), 0);
});
