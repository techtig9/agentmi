import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeMulticlassLabels, NotMulticlassError } from "../lib/ml/encode-multiclass";

test("encodes 3 classes alphabetically", () => {
  const result = encodeMulticlassLabels(["dog", "cat", "bird", "cat", "dog"]);
  assert.deepEqual(result.classNames, ["bird", "cat", "dog"]);
  assert.deepEqual(result.encoded, [2, 1, 0, 1, 2]);
});

test("class name at each encoded index round-trips correctly", () => {
  const result = encodeMulticlassLabels(["red", "green", "blue", "red"]);
  result.encoded.forEach((code, i) => {
    const original = ["red", "green", "blue", "red"][i];
    assert.equal(result.classNames[code], original);
  });
});

test("trims whitespace before grouping", () => {
  const result = encodeMulticlassLabels([" cat", "cat ", "dog", "bird"]);
  assert.equal(result.classNames.length, 3); // "cat" and " cat"/"cat " collapse together
});

test("rejects fewer than 3 distinct classes (that's the binary encoder's job)", () => {
  assert.throws(() => encodeMulticlassLabels(["yes", "no", "yes"]), NotMulticlassError);
});

test("rejects more than 20 distinct classes", () => {
  const values = Array.from({ length: 25 }, (_, i) => `class_${i}`);
  assert.throws(() => encodeMulticlassLabels(values), NotMulticlassError);
});

test("accepts exactly 3 classes (the boundary)", () => {
  const result = encodeMulticlassLabels(["a", "b", "c"]);
  assert.equal(result.classNames.length, 3);
});

test("accepts exactly 20 classes (the boundary)", () => {
  const values = Array.from({ length: 20 }, (_, i) => `class_${i}`);
  const result = encodeMulticlassLabels(values);
  assert.equal(result.classNames.length, 20);
});
