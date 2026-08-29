import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../lib/ml/csv";

test("parses a simple CSV with header", () => {
  const rows = parseCsv("name,age\nAlice,30\nBob,25");
  assert.deepEqual(rows, [
    { name: "Alice", age: "30" },
    { name: "Bob", age: "25" },
  ]);
});

test("handles quoted fields containing commas", () => {
  const rows = parseCsv('name,address\n"Doe, John","123 Main St, Apt 4"');
  assert.deepEqual(rows, [{ name: "Doe, John", address: "123 Main St, Apt 4" }]);
});

test("handles escaped double quotes inside quoted fields", () => {
  const rows = parseCsv('quote\n"She said ""hello"""');
  assert.deepEqual(rows, [{ quote: 'She said "hello"' }]);
});

test("missing trailing fields default to empty string", () => {
  const rows = parseCsv("a,b,c\n1,2");
  assert.deepEqual(rows, [{ a: "1", b: "2", c: "" }]);
});

test("empty input returns no rows", () => {
  assert.deepEqual(parseCsv(""), []);
});

test("header-only input returns no rows", () => {
  assert.deepEqual(parseCsv("a,b,c"), []);
});

test("blank lines are skipped rather than producing empty rows", () => {
  const rows = parseCsv("a,b\n1,2\n\n3,4");
  assert.equal(rows.length, 2);
});
