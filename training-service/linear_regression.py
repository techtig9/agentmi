"""
Stdlib-only linear regression via gradient descent — the regression
counterpart to logistic_regression.py, same MVP-now/swap-later rationale.
"""
import math
import random


def _dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


class LinearRegressionModel:
    def __init__(self, weights: list[float], bias: float, feature_names: list[str],
                 feature_means: list[float], feature_stds: list[float]):
        self.weights = weights
        self.bias = bias
        self.feature_names = feature_names
        self.feature_means = feature_means
        self.feature_stds = feature_stds

    def _normalize(self, row: list[float]) -> list[float]:
        return [
            (x - m) / s if s != 0 else 0.0
            for x, m, s in zip(row, self.feature_means, self.feature_stds)
        ]

    def predict(self, row: list[float]) -> float:
        return _dot(self.weights, self._normalize(row)) + self.bias


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


def train_regressor(
    features: list[list[float]],
    targets: list[float],
    feature_names: list[str],
    learning_rate: float = 0.1,
    epochs: int = 500,
    l2_penalty: float = 0.01,
    seed: int = 42,
) -> LinearRegressionModel:
    if len(features) != len(targets):
        raise ValueError("features and targets must have the same length")
    if len(features) == 0:
        raise ValueError("cannot train on an empty dataset")

    rng = random.Random(seed)
    normalized, means, stds = _standardize(features)
    n_features = len(feature_names)
    n_samples = len(normalized)

    weights = [rng.uniform(-0.01, 0.01) for _ in range(n_features)]
    bias = 0.0

    for _ in range(epochs):
        grad_w = [0.0] * n_features
        grad_b = 0.0

        for row, target in zip(normalized, targets):
            pred = _dot(weights, row) + bias
            error = pred - target
            for i in range(n_features):
                grad_w[i] += error * row[i]
            grad_b += error

        for i in range(n_features):
            grad_w[i] = grad_w[i] / n_samples + l2_penalty * weights[i]
            weights[i] -= learning_rate * grad_w[i]
        bias -= learning_rate * (grad_b / n_samples)

    return LinearRegressionModel(weights, bias, feature_names, means, stds)
