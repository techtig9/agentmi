import { test } from "node:test";
import assert from "node:assert/strict";
import { profileDataset } from "../lib/ml/profile";
import { trainTestSplit } from "../lib/ml/split";
import { classificationMetrics, regressionMetrics } from "../lib/ml/metrics";

test("profileDataset handles an empty dataset", () => {
  const profile = profileDataset([]);
  assert.equal(profile.rowCount, 0);
  assert.equal(profile.suggestedTargetColumn, null);
});

test("profileDataset infers numeric, categorical, and boolean columns correctly", () => {
  const rows = [
    { age: "34", plan: "pro", churned: "true" },
    { age: "51", plan: "free", churned: "false" },
    { age: "29", plan: "pro", churned: "false" },
  ];
  const profile = profileDataset(rows);
  const byName = Object.fromEntries(profile.columns.map((c) => [c.name, c]));
  assert.equal(byName.age.type, "numeric");
  assert.equal(byName.plan.type, "categorical");
  assert.equal(byName.churned.type, "boolean");
});

test("profileDataset reports missing value counts and percentages", () => {
  const rows = [{ x: "1" }, { x: "" }, { x: "3" }, { x: "" }];
  const profile = profileDataset(rows);
  assert.equal(profile.columns[0].missingCount, 2);
  assert.equal(profile.columns[0].missingPct, 50);
});

test("profileDataset suggests the lowest-missing low-cardinality column as the target", () => {
  const rows = [
    { id: "1", notes: "a long free-text field here", churned: "true" },
    { id: "2", notes: "another distinct note", churned: "" },
    { id: "3", notes: "yet another distinct note", churned: "false" },
  ];
  const profile = profileDataset(rows);
  assert.equal(profile.suggestedTargetColumn, "churned");
});

test("trainTestSplit is deterministic for a given seed", () => {
  const rows = Array.from({ length: 100 }, (_, i) => i);
  const a = trainTestSplit(rows, 0.2, 7);
  const b = trainTestSplit(rows, 0.2, 7);
  assert.deepEqual(a.train, b.train);
  assert.deepEqual(a.test, b.test);
});

test("trainTestSplit produces different splits for different seeds", () => {
  const rows = Array.from({ length: 100 }, (_, i) => i);
  const a = trainTestSplit(rows, 0.2, 1);
  const b = trainTestSplit(rows, 0.2, 2);
  assert.notDeepEqual(a.train, b.train);
});

test("trainTestSplit respects the requested test fraction and covers every row exactly once", () => {
  const rows = Array.from({ length: 50 }, (_, i) => i);
  const { train, test } = trainTestSplit(rows, 0.3, 42);
  assert.equal(test.length, 15);
  assert.equal(train.length, 35);
  const combined = new Set([...train, ...test]);
  assert.equal(combined.size, 50); // no row duplicated or dropped
});

test("trainTestSplit rejects an out-of-range fraction", () => {
  assert.throws(() => trainTestSplit([1, 2, 3], 0));
  assert.throws(() => trainTestSplit([1, 2, 3], 1));
});

test("classificationMetrics computes a known confusion matrix correctly", () => {
  // 2 TP, 1 FP, 2 TN, 1 FN for positiveLabel="churn"
  const actual =    ["churn", "churn", "stay", "stay", "stay", "churn"];
  const predicted = ["churn", "stay",  "churn","stay", "stay", "churn"];
  const metrics = classificationMetrics(actual, predicted, "churn");
  assert.equal(metrics.confusionMatrix.truePositive, 2);
  assert.equal(metrics.confusionMatrix.falsePositive, 1);
  assert.equal(metrics.confusionMatrix.trueNegative, 2);
  assert.equal(metrics.confusionMatrix.falseNegative, 1);
  assert.equal(metrics.accuracy, Math.round((4 / 6) * 10000) / 10000);
  assert.equal(metrics.precision, Math.round((2 / 3) * 10000) / 10000);
  assert.equal(metrics.recall, Math.round((2 / 3) * 10000) / 10000);
});

test("classificationMetrics rejects mismatched-length arrays", () => {
  assert.throws(() => classificationMetrics(["a"], ["a", "b"], "a"));
});

test("regressionMetrics computes RMSE and MAE for known values", () => {
  const actual = [10, 20, 30];
  const predicted = [12, 18, 33];
  // errors: -2, 2, -3 -> abs: 2,2,3 -> MAE = 7/3; squared: 4,4,9 -> RMSE = sqrt(17/3)
  const metrics = regressionMetrics(actual, predicted);
  assert.equal(metrics.mae, Math.round((7 / 3) * 10000) / 10000);
  assert.equal(metrics.rmse, Math.round(Math.sqrt(17 / 3) * 10000) / 10000);
});

test("perfect predictions give zero error", () => {
  const metrics = regressionMetrics([1, 2, 3], [1, 2, 3]);
  assert.equal(metrics.rmse, 0);
  assert.equal(metrics.mae, 0);
});
