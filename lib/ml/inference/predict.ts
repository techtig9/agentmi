// Mirrors the exact math in training-service/logistic_regression.py and
// linear_regression.py. Trained model params (weights/bias/feature
// stats) are small enough to store in agents.config and replay here —
// no need to call back into the training service just to predict.

export interface BinaryStoredModel {
  type: "logistic_regression" | "linear_regression";
  weights: number[];
  bias: number;
  feature_means: number[];
  feature_stds: number[];
  feature_names: string[];
}

export interface MulticlassStoredModel {
  type: "multiclass_logistic_regression";
  class_labels: number[];
  classifiers: { class_label: number; weights: number[]; bias: number }[];
  feature_means: number[];
  feature_stds: number[];
  feature_names: string[];
}

export type StoredModel = BinaryStoredModel | MulticlassStoredModel;

function standardize(rawFeatures: number[], means: number[], stds: number[]): number[] {
  return rawFeatures.map((x, i) => (stds[i] === 0 ? 0 : (x - means[i]) / stds[i]));
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

export interface PredictionInput {
  [featureName: string]: number;
}

export class FeatureMismatchError extends Error {}

function orderFeatures(model: StoredModel, input: PredictionInput): number[] {
  return model.feature_names.map((name) => {
    if (!(name in input)) {
      throw new FeatureMismatchError(`Missing required feature: "${name}"`);
    }
    return input[name];
  });
}

export function predictLogistic(model: StoredModel, input: PredictionInput): { probability: number; label: 0 | 1 } {
  if (model.type !== "logistic_regression") {
    throw new Error(`predictLogistic called on a ${model.type} model`);
  }
  const raw = orderFeatures(model, input);
  const standardized = standardize(raw, model.feature_means, model.feature_stds);
  const probability = sigmoid(dot(standardized, model.weights) + model.bias);
  return { probability, label: probability >= 0.5 ? 1 : 0 };
}

export function predictLinear(model: StoredModel, input: PredictionInput): { value: number } {
  if (model.type !== "linear_regression") {
    throw new Error(`predictLinear called on a ${model.type} model`);
  }
  const raw = orderFeatures(model, input);
  const standardized = standardize(raw, model.feature_means, model.feature_stds);
  const value = dot(standardized, model.weights) + model.bias;
  return { value };
}

export function predictMulticlass(
  model: StoredModel,
  input: PredictionInput
): { classLabel: number; scores: Record<number, number> } {
  if (model.type !== "multiclass_logistic_regression") {
    throw new Error(`predictMulticlass called on a ${model.type} model`);
  }
  const raw = orderFeatures(model, input);
  const standardized = standardize(raw, model.feature_means, model.feature_stds);

  const scores: Record<number, number> = {};
  let bestLabel = model.classifiers[0].class_label;
  let bestScore = -Infinity;

  for (const clf of model.classifiers) {
    const score = sigmoid(dot(standardized, clf.weights) + clf.bias);
    scores[clf.class_label] = score;
    if (score > bestScore) {
      bestScore = score;
      bestLabel = clf.class_label;
    }
  }

  return { classLabel: bestLabel, scores };
}

export function predict(model: StoredModel, input: PredictionInput) {
  if (model.type === "logistic_regression") return predictLogistic(model, input);
  if (model.type === "linear_regression") return predictLinear(model, input);
  return predictMulticlass(model, input);
}
