export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  confusionMatrix: { truePositive: number; falsePositive: number; trueNegative: number; falseNegative: number };
}

/** Binary classification metrics. `positiveLabel` identifies which class counts as "positive" for precision/recall. */
export function classificationMetrics(
  actual: string[],
  predicted: string[],
  positiveLabel: string
): ClassificationMetrics {
  if (actual.length !== predicted.length) {
    throw new Error("actual and predicted must be the same length");
  }
  if (actual.length === 0) {
    throw new Error("cannot compute metrics on an empty set");
  }

  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < actual.length; i++) {
    const isActualPositive = actual[i] === positiveLabel;
    const isPredPositive = predicted[i] === positiveLabel;
    if (isActualPositive && isPredPositive) tp++;
    else if (!isActualPositive && isPredPositive) fp++;
    else if (!isActualPositive && !isPredPositive) tn++;
    else fn++;
  }

  const accuracy = (tp + tn) / actual.length;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return {
    accuracy: round(accuracy),
    precision: round(precision),
    recall: round(recall),
    f1: round(f1),
    confusionMatrix: { truePositive: tp, falsePositive: fp, trueNegative: tn, falseNegative: fn },
  };
}

export interface RegressionMetrics {
  rmse: number;
  mae: number;
}

export function regressionMetrics(actual: number[], predicted: number[]): RegressionMetrics {
  if (actual.length !== predicted.length) {
    throw new Error("actual and predicted must be the same length");
  }
  if (actual.length === 0) {
    throw new Error("cannot compute metrics on an empty set");
  }

  let sumSquaredError = 0;
  let sumAbsError = 0;
  for (let i = 0; i < actual.length; i++) {
    const error = actual[i] - predicted[i];
    sumSquaredError += error * error;
    sumAbsError += Math.abs(error);
  }

  return {
    rmse: round(Math.sqrt(sumSquaredError / actual.length)),
    mae: round(sumAbsError / actual.length),
  };
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}
