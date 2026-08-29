import assert from "node:assert/strict";
import test from "node:test";
import { __runtimeTestables } from "../lib/chat/run-agent-chat";

test("agent runtime uses safe model/token defaults", () => {
  assert.equal(__runtimeTestables.boundedInteger(undefined, 1024, 128, 4096), 1024);
  assert.equal(__runtimeTestables.boundedInteger(99999, 1024, 128, 4096), 4096);
  assert.equal(__runtimeTestables.boundedInteger(1, 1024, 128, 4096), 128);
});

test("agent config accepts object configuration and rejects arrays/null", () => {
  assert.deepEqual(__runtimeTestables.agentConfig({ model: "x" }), { model: "x" });
  assert.deepEqual(__runtimeTestables.agentConfig(null), {});
  assert.deepEqual(__runtimeTestables.agentConfig(["bad"]), {});
});

test("runtime bounds conversation history to prevent unbounded provider cost", () => {
  assert.equal(__runtimeTestables.MAX_HISTORY_MESSAGES, 20);
});
