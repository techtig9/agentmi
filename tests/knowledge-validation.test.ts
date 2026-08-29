import assert from "node:assert/strict";
import test from "node:test";
import { chunkText } from "../lib/rag/chunk";
import { sourceTitle, validateKnowledgeText, validateKnowledgeUrl } from "../lib/knowledge/validation";

test("knowledge text is normalized and bounded", () => {
  assert.deepEqual(validateKnowledgeText("  hello\u0000 world  "), { ok: true, text: "hello world" });
  assert.equal(validateKnowledgeText("   ").ok, false);
});

test("knowledge URL validation permits HTTPS and rejects unsafe hosts", () => {
  assert.equal(validateKnowledgeUrl("https://example.com/docs").ok, true);
  assert.equal(validateKnowledgeUrl("http://example.com").ok, false);
  assert.equal(validateKnowledgeUrl("https://localhost/admin").ok, false);
  assert.equal(validateKnowledgeUrl("https://192.168.1.10/admin").ok, false);
  assert.equal(validateKnowledgeUrl("https://user:pass@example.com").ok, false);
});

test("source titles are stable and useful", () => {
  assert.equal(sourceTitle("url", "https://docs.example.com/a"), "docs.example.com");
  assert.equal(sourceTitle("text", "\nProduct FAQ\nRefunds are allowed"), "Product FAQ");
});

test("chunking keeps overlap and preserves all source content", () => {
  const text = "A".repeat(1000);
  const chunks = chunkText(text, { maxChars: 300, overlapChars: 50 });
  assert.ok(chunks.length >= 3);
  assert.equal(chunks[0].charStart, 0);
  assert.equal(chunks[1].charStart, 250);
  assert.equal(chunks.at(-1)?.charEnd, text.length);
});
