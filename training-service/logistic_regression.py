"""
Minimal logistic regression trained by gradient descent, using only the
Python standard library. This is the MVP algorithm actually running behind
Agentmi's ML Agent builder until the service is deployed somewhere with
network access to install scikit-learn/XGBoost (see README in this folder) —
the training_service.train_classifier() interface stays the same either way,
so swapping the implementation later doesn't change any caller.
"""
import math
import random


def _dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def _sigmoid(z: float) -> float:
    # Clamp to avoid OverflowError on extreme inputs.
    z = max(-60.0, min(60.0, z))
    return 1.0 / (1.0 + math.exp(-z))


class LogisticRegressionModel:
    def __init__(self, weights: list[float], bias: float, feature_names: list[str],
                 feature_means: list[float], feature_stds: list[float]):
        self.weights = weights
        self.bias = bias
        self.feature_names = feature_names
        # Standardization stats are part of the model — inference must
        # normalize new inputs the same way training data was normalized.
        self.feature_means = feature_means
        self.feature_stds = feature_stds

    def _normalize(self, row: list[float]) -> list[float]:
        return [
            (x - m) / s if s != 0 else 0.0
            for x, m, s in zip(row, self.feature_means, self.feature_stds)
        ]

    def predict_proba(self, row: list[float]) -> float:
        normalized = self._normalize(row)
        return _sigmoid(_dot(self.weights, normalized) + self.bias)

    def predict(self, row: list[float], threshold: float = 0.5) -> int:
        return 1 if self.predict_proba(row) >= threshold else 0


def _standardize(rows: list[list[float]]) -> tuple[list[list[float]], list[float], list[float]]:
    n_features = len(rows[0])
    means = [sum(r[i] for r in rows) / len(rows) for i in range(n_features)]
    stds = []
    for i in range(n_features):
        variance = sum((r[i] - means[i]) ** 2 for r in rows) / len(rows)
        stds.append(math.sqrt(variance))

    normalized = [
        [(r[i] - means[i]) / stds[i] if stds[i] != 0 else 0.0 for i in range(n_features)]
        for r in rows
    ]
    return normalized, means, stds


def train_classifier(
    features: list[list[float]],
    labels: list[int],
    feature_names: list[str],
    learning_rate: float = 0.1,
    epochs: int = 500,
    l2_penalty: float = 0.01,
    seed: int = 42,
) -> LogisticRegressionModel:
    """Trains binary logistic regression via batch gradient descent with L2 regularization."""
    if len(features) != len(labels):
        raise ValueError("features and labels must have the same length")
    if len(features) == 0:
        raise ValueError("cannot train on an empty dataset")
    if any(label not in (0, 1) for label in labels):
        raise ValueError("labels must be binary (0 or 1)")

    rng = random.Random(seed)
    normalized, means, stds = _standardize(features)
    n_features = len(feature_names)
    n_samples = len(normalized)

    weights = [rng.uniform(-0.01, 0.01) for _ in range(n_features)]
    bias = 0.0

    for _ in range(epochs):
        grad_w = [0.0] * n_features
        grad_b = 0.0

        for row, label in zip(normalized, labels):
            pred = _sigmoid(_dot(weights, row) + bias)
            error = pred - label
            for i in range(n_features):
                grad_w[i] += error * row[i]
            grad_b += error

        for i in range(n_features):
            grad_w[i] = grad_w[i] / n_samples + l2_penalty * weights[i]
            weights[i] -= learning_rate * grad_w[i]
        bias -= learning_rate * (grad_b / n_samples)

    return LogisticRegressionModel(weights, bias, feature_names, means, stds)
