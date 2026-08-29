"""
Multi-class classification via One-vs-Rest: trains one binary
logistic_regression classifier per class (class k vs. everyone else),
then predicts by taking whichever classifier is most confident.

Deliberately built on top of the already-tested train_classifier()
rather than a from-scratch softmax/multinomial implementation — reuses
its tested gradient descent + standardization, and one-vs-rest is a
well-understood, correct reduction from multi-class to binary. The
tradeoff: less parameter-efficient than true softmax regression, and
class probabilities aren't guaranteed to sum to 1 (each is an
independent sigmoid) — acceptable for the confidence ranking / argmax
use this serves.
"""
from logistic_regression import train_classifier, LogisticRegressionModel


class MulticlassLogisticRegressionModel:
    def __init__(self, class_models: list[LogisticRegressionModel], class_labels: list[int]):
        if len(class_models) != len(class_labels):
            raise ValueError("class_models and class_labels must be the same length")
        self.class_models = class_models  # index-aligned with class_labels
        self.class_labels = class_labels
        # Standardization is identical across all K one-vs-rest models
        # (it only depends on the shared training features, never on
        # which class is being distinguished) — safe to read from any one.
        self.feature_names = class_models[0].feature_names
        self.feature_means = class_models[0].feature_means
        self.feature_stds = class_models[0].feature_stds

    def predict_scores(self, row: list[float]) -> list[float]:
        return [m.predict_proba(row) for m in self.class_models]

    def predict(self, row: list[float]) -> int:
        scores = self.predict_scores(row)
        best_idx = max(range(len(scores)), key=lambda i: scores[i])
        return self.class_labels[best_idx]


def train_multiclass_classifier(
    features: list[list[float]],
    labels: list[int],
    feature_names: list[str],
    seed: int = 42,
) -> MulticlassLogisticRegressionModel:
    if len(features) != len(labels):
        raise ValueError("features and labels must have the same length")
    if len(features) == 0:
        raise ValueError("cannot train on an empty dataset")

    class_labels = sorted(set(labels))
    if len(class_labels) < 3:
        raise ValueError(
            f"train_multiclass_classifier requires at least 3 distinct classes, "
            f"got {len(class_labels)} — use train_classifier for binary targets"
        )
    if len(class_labels) > 20:
        raise ValueError(
            f"got {len(class_labels)} distinct classes — this looks like a free-text "
            f"or ID column, not a classification target"
        )

    class_models = []
    for k in class_labels:
        binary_labels = [1 if label == k else 0 for label in labels]
        model = train_classifier(features, binary_labels, feature_names, seed=seed)
        class_models.append(model)

    return MulticlassLogisticRegressionModel(class_models, class_labels)
