import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyBuildIntent } from "../lib/agent-builder/classify";

test("clear customer support description classifies as AI", () => {
  const result = classifyBuildIntent(
    "I want a chatbot that can answer questions from our FAQ and talk to customers"
  );
  assert.equal(result.kind, "ai");
  assert.ok(result.matchedSignals.length > 0);
});

test("clear churn-prediction description classifies as ML", () => {
  const result = classifyBuildIntent(
    "I have a CSV of customer data and want to predict which customers will churn"
  );
  assert.equal(result.kind, "ml");
  assert.ok(result.matchedSignals.includes("predict") || result.matchedSignals.includes("csv"));
});

test("vague description with no signals defaults to AI with low confidence", () => {
  const result = classifyBuildIntent("Something to help my business");
  assert.equal(result.kind, "ai");
  assert.equal(result.confidence, 0.5);
});

test("mixed description leans toward the stronger signal count", () => {
  // 2 ML signals ("dataset", "forecast") vs 1 AI signal ("assistant")
  const result = classifyBuildIntent(
    "An assistant that uses our sales dataset to forecast next quarter"
  );
  assert.equal(result.kind, "ml");
});

test("confidence never reports below 0.5 or above 1", () => {
  const strong = classifyBuildIntent(
    "predict churn using our dataset, forecast demand, classify fraud, score leads"
  );
  assert.ok(strong.confidence <= 1 && strong.confidence >= 0.5);
});
