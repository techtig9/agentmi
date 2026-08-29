import assert from "node:assert/strict";
import test from "node:test";
import { __runtimeTestables } from "../lib/chat/run-agent-chat";

test("provider chain is Groq -> Cerebras -> OpenRouter -> optional Anthropic", () => {
  const names = __runtimeTestables.providerConfigs().map((p) => p.name);
  assert.deepEqual(names, ["groq", "cerebras", "openrouter", "anthropic"]);
});

test("quota and temporary provider failures are retryable", () => {
  assert.equal(__runtimeTestables.quotaOrTemporaryFailure(429), true);
  assert.equal(__runtimeTestables.quotaOrTemporaryFailure(503), true);
  assert.equal(__runtimeTestables.quotaOrTemporaryFailure(401), false);
});

test("complex tasks can be detected without requiring Anthropic", () => {
  assert.equal(__runtimeTestables.isComplexTask("Please analyze this architecture step by step", [], 1024), true);
  assert.equal(__runtimeTestables.isComplexTask("hello", [], 1024), false);
});
