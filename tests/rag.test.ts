import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "../lib/rag/chunk";
import { cosineSimilarity, retrieveTopK } from "../lib/rag/similarity";

test("empty text produces no chunks", () => {
  assert.deepEqual(chunkText(""), []);
  assert.deepEqual(chunkText("   "), []);
});

test("short text produces exactly one chunk covering all of it", () => {
  const chunks = chunkText("A short FAQ answer.", { maxChars: 800, overlapChars: 150 });
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].text, "A short FAQ answer.");
});

test("long text is split into multiple chunks with overlap", () => {
  const paragraph = "This is a sentence about our refund policy. ".repeat(60); // ~2700 chars
  const chunks = chunkText(paragraph, { maxChars: 800, overlapChars: 150 });
  assert.ok(chunks.length > 1);
  // Every chunk after the first should start inside the previous chunk's span (overlap present).
  for (let i = 1; i < chunks.length; i++) {
    assert.ok(chunks[i].charStart < chunks[i - 1].charEnd);
  }
});

test("chunks stay at or under maxChars plus a small sentence-boundary allowance", () => {
  const paragraph = "Word ".repeat(1000);
  const chunks = chunkText(paragraph, { maxChars: 500, overlapChars: 50 });
  for (const c of chunks) {
    assert.ok(c.text.length <= 500, `chunk too long: ${c.text.length}`);
  }
});

test("rejects overlap >= maxChars (would never make progress)", () => {
  assert.throws(() => chunkText("some text here", { maxChars: 100, overlapChars: 100 }));
});

test("cosine similarity of identical vectors is 1", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 2, 3], [1, 2, 3]) - 1) < 1e-9);
});

test("cosine similarity of orthogonal vectors is 0", () => {
  assert.ok(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-9);
});

test("cosine similarity throws on mismatched vector lengths", () => {
  assert.throws(() => cosineSimilarity([1, 2], [1, 2, 3]));
});

test("retrieveTopK returns the k closest chunks, highest score first", () => {
  const candidates = [
    { id: "a", text: "refunds", vector: [1, 0] },
    { id: "b", text: "unrelated", vector: [0, 1] },
    { id: "c", text: "refund policy details", vector: [0.9, 0.1] },
  ];
  const results = retrieveTopK([1, 0], candidates, 2);
  assert.equal(results.length, 2);
  assert.equal(results[0].id, "a");
  assert.equal(results[1].id, "c");
});

test("retrieveTopK with k=0 returns nothing", () => {
  const candidates = [{ id: "a", text: "x", vector: [1, 0] }];
  assert.deepEqual(retrieveTopK([1, 0], candidates, 0), []);
});
