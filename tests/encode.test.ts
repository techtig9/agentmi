import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeBinaryLabels, needsEncoding, NotBinaryError } from "../lib/ml/encode";

test("yes/no encodes yes to 1, no to 0", () => {
  const result = encodeBinaryLabels(["yes", "no", "yes", "no", "no"]);
  assert.equal(result.mapping.yes, 1);
  assert.equal(result.mapping.no, 0);
  assert.deepEqual(result.encoded, [1, 0, 1, 0, 0]);
  assert.equal(result.warnings.length, 0);
});

test("churned/retained encodes churned to 1 (the outcome you're predicting)", () => {
  const result = encodeBinaryLabels(["retained", "churned", "retained"]);
  assert.equal(result.mapping.churned, 1);
  assert.equal(result.mapping.retained, 0);
});

test("already-clean 0/1 strings still work and don't need this at all (see needsEncoding)", () => {
  const result = encodeBinaryLabels(["0", "1", "1", "0"]);
  assert.equal(result.mapping["1"], 1);
  assert.equal(result.mapping["0"], 0);
});

test("is case-insensitive", () => {
  const result = encodeBinaryLabels(["YES", "No", "yes"]);
  assert.equal(result.mapping.yes, 1);
  assert.equal(result.mapping.no, 0);
});

test("unrecognized binary pair falls back to alphabetical order with a warning", () => {
  const result = encodeBinaryLabels(["cat", "dog", "cat"]);
  assert.equal(result.mapping.cat, 0); // alphabetically first
  assert.equal(result.mapping.dog, 1);
  assert.equal(result.warnings.length, 1);
});

test("rejects a column with more than 2 distinct values", () => {
  assert.throws(() => encodeBinaryLabels(["a", "b", "c"]), NotBinaryError);
});

test("rejects a column with only 1 distinct value", () => {
  assert.throws(() => encodeBinaryLabels(["only_one", "only_one"]), NotBinaryError);
});

test("needsEncoding is false for already-clean 0/1", () => {
  assert.equal(needsEncoding(["0", "1", "0"]), false);
});

test("needsEncoding is true for yes/no", () => {
  assert.equal(needsEncoding(["yes", "no", "yes"]), true);
});

test("needsEncoding is false for a non-binary column (encoding wouldn't apply anyway)", () => {
  assert.equal(needsEncoding(["a", "b", "c"]), false);
});
