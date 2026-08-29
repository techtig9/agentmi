import random
import unittest

from logistic_regression import train_classifier


class TestLogisticRegression(unittest.TestCase):
    def test_learns_a_linearly_separable_single_feature(self):
        # label = 1 if x >= 5 else 0 — trivially separable, should reach high accuracy.
        features = [[float(x)] for x in range(0, 10)]
        labels = [1 if x >= 5 else 0 for x in range(0, 10)]

        model = train_classifier(features, labels, feature_names=["x"], epochs=800)

        correct = sum(
            1 for row, label in zip(features, labels) if model.predict(row) == label
        )
        accuracy = correct / len(labels)
        self.assertGreaterEqual(accuracy, 0.9, f"accuracy too low: {accuracy}")

    def test_learns_a_linearly_separable_two_feature_dataset(self):
        rng = random.Random(0)
        features: list[list[float]] = []
        labels: list[int] = []
        # Two clusters: class 0 around (0,0), class 1 around (10,10).
        for _ in range(40):
            features.append([rng.uniform(-2, 2), rng.uniform(-2, 2)])
            labels.append(0)
        for _ in range(40):
            features.append([rng.uniform(8, 12), rng.uniform(8, 12)])
            labels.append(1)

        model = train_classifier(features, labels, feature_names=["a", "b"], epochs=500)

        correct = sum(
            1 for row, label in zip(features, labels) if model.predict(row) == label
        )
        accuracy = correct / len(labels)
        self.assertGreaterEqual(accuracy, 0.95, f"accuracy too low: {accuracy}")

    def test_predict_proba_is_bounded(self):
        features = [[0.0], [1.0], [2.0], [3.0]]
        labels = [0, 0, 1, 1]
        model = train_classifier(features, labels, feature_names=["x"], epochs=200)

        for row in features:
            p = model.predict_proba(row)
            self.assertGreaterEqual(p, 0.0)
            self.assertLessEqual(p, 1.0)

    def test_rejects_mismatched_lengths(self):
        with self.assertRaises(ValueError):
            train_classifier([[1.0], [2.0]], [0], feature_names=["x"])

    def test_rejects_empty_dataset(self):
        with self.assertRaises(ValueError):
            train_classifier([], [], feature_names=["x"])

    def test_rejects_non_binary_labels(self):
        with self.assertRaises(ValueError):
            train_classifier([[1.0], [2.0]], [0, 2], feature_names=["x"])

    def test_deterministic_given_same_seed(self):
        features = [[float(x)] for x in range(20)]
        labels = [1 if x >= 10 else 0 for x in range(20)]

        model_a = train_classifier(features, labels, feature_names=["x"], seed=7, epochs=100)
        model_b = train_classifier(features, labels, feature_names=["x"], seed=7, epochs=100)

        self.assertEqual(model_a.weights, model_b.weights)
        self.assertEqual(model_a.bias, model_b.bias)


if __name__ == "__main__":
    unittest.main()
