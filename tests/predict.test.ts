import { test } from "node:test";
import assert from "node:assert/strict";
import { predictLogistic, predictLinear, predictMulticlass, predict, FeatureMismatchError, type StoredModel } from "../lib/ml/inference/predict";

// Real output from POST /train — trained on 3 well-separated clusters
// (near (0,0)→class 0, (10,0)→class 1, (5,10)→class 2) via one-vs-rest.
const REAL_MULTICLASS_MODEL: StoredModel = {
  type: "multiclass_logistic_regression",
  class_labels: [0, 1, 2],
  classifiers: [
    { class_label: 0, weights: [-2.7143840751703925, -1.493009638567104], bias: -1.06918009701622 },
    { class_label: 1, weights: [2.747459170369903, -1.4089541760805249], bias: -1.1205242308131935 },
    { class_label: 2, weights: [-0.02749741761592248, 2.9138881753128754], bias: -1.6320342885315693 },
  ],
  feature_means: [5.5, 3.3],
  feature_stds: [4.036264185039004, 4.450200637531494],
  feature_names: ["x", "y"],
};

// Real output from POST /train against training-service/server.py —
// trained on 10 points split into two visually separable clusters
// around (1-3,1-3) → label 0 and (8-10,8-10) → label 1.
const REAL_LOGISTIC_MODEL: StoredModel = {
  type: "logistic_regression",
  weights: [1.8601745742688123, 1.9051919919367057],
  bias: -1.0192703528019942,
  feature_means: [4.5, 4.625],
  feature_stds: [3.570714214271425, 3.7059917700933984],
  feature_names: ["a", "b"],
};

// Real output from POST /train against the same service — trained on
// y = 3x + 7 + small noise (10 points, x = 1..10).
const REAL_LINEAR_MODEL: StoredModel = {
  type: "linear_regression",
  weights: [9.026172609759808],
  bias: 23.124999999999986,
  feature_means: [5.375],
  feature_stds: [3.0388114452858046],
  feature_names: ["x"],
};

test("logistic model correctly classifies a point deep in the class-0 cluster", () => {
  const result = predictLogistic(REAL_LOGISTIC_MODEL, { a: 1, b: 1 });
  assert.equal(result.label, 0);
  assert.ok(result.probability < 0.3, `expected low probability, got ${result.probability}`);
});

test("logistic model correctly classifies a point deep in the class-1 cluster", () => {
  const result = predictLogistic(REAL_LOGISTIC_MODEL, { a: 10, b: 10 });
  assert.equal(result.label, 1);
  assert.ok(result.probability > 0.7, `expected high probability, got ${result.probability}`);
});

test("logistic probability is always between 0 and 1", () => {
  const result = predictLogistic(REAL_LOGISTIC_MODEL, { a: 1000, b: -1000 });
  assert.ok(result.probability >= 0 && result.probability <= 1);
});

test("linear model recovers close to the true y = 3x + 7 relationship at x=10", () => {
  const result = predictLinear(REAL_LINEAR_MODEL, { x: 10 });
  assert.ok(Math.abs(result.value - 37) < 1, `expected ~37, got ${result.value}`);
});

test("linear model recovers close to the true relationship at x=1", () => {
  const result = predictLinear(REAL_LINEAR_MODEL, { x: 1 });
  assert.ok(Math.abs(result.value - 10) < 1, `expected ~10, got ${result.value}`);
});

test("missing a required feature throws FeatureMismatchError, not a silent NaN", () => {
  assert.throws(() => predictLogistic(REAL_LOGISTIC_MODEL, { a: 1 }), FeatureMismatchError);
});

test("calling predictLogistic on a linear model's type is rejected", () => {
  assert.throws(() => predictLogistic(REAL_LINEAR_MODEL, { x: 1 }));
});

test("the generic predict() dispatches to the correct implementation by model.type", () => {
  const logisticResult = predict(REAL_LOGISTIC_MODEL, { a: 9, b: 9 });
  const linearResult = predict(REAL_LINEAR_MODEL, { x: 5 });
  assert.ok("label" in logisticResult);
  assert.ok("value" in linearResult);
});

test("multiclass model correctly classifies a point near each of the 3 real clusters", () => {
  assert.equal(predictMulticlass(REAL_MULTICLASS_MODEL, { x: 1, y: 0.5 }).classLabel, 0);
  assert.equal(predictMulticlass(REAL_MULTICLASS_MODEL, { x: 10.2, y: 0.4 }).classLabel, 1);
  assert.equal(predictMulticlass(REAL_MULTICLASS_MODEL, { x: 5.3, y: 10.1 }).classLabel, 2);
});

test("multiclass scores include every class label, each a valid probability", () => {
  const result = predictMulticlass(REAL_MULTICLASS_MODEL, { x: 5, y: 5 });
  assert.deepEqual(Object.keys(result.scores).map(Number).sort(), [0, 1, 2]);
  for (const score of Object.values(result.scores)) {
    assert.ok(score >= 0 && score <= 1);
  }
});

test("multiclass predict() dispatches correctly via the generic entry point", () => {
  const result = predict(REAL_MULTICLASS_MODEL, { x: 1, y: 0.5 });
  assert.ok("classLabel" in result);
  assert.equal((result as { classLabel: number }).classLabel, 0);
});

test("predictMulticlass rejects a binary model", () => {
  assert.throws(() => predictMulticlass(REAL_LOGISTIC_MODEL, { a: 1, b: 1 }));
});

test("missing a feature on a multiclass model throws FeatureMismatchError", () => {
  assert.throws(() => predictMulticlass(REAL_MULTICLASS_MODEL, { x: 1 }), FeatureMismatchError);
});
