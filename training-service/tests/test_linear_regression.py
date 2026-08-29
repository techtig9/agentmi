import unittest

from linear_regression import train_regressor


class TestLinearRegression(unittest.TestCase):
    def test_recovers_a_known_linear_relationship(self):
        # y = 3x + 7, noiseless — a well-trained model should predict close to this.
        features = [[float(x)] for x in range(0, 20)]
        targets = [3 * x + 7 for x in range(0, 20)]

        model = train_regressor(features, targets, feature_names=["x"], epochs=1000)

        predictions = [model.predict(row) for row in features]
        errors = [abs(p - t) for p, t in zip(predictions, targets)]
        mean_error = sum(errors) / len(errors)
        self.assertLess(mean_error, 1.0, f"mean error too high: {mean_error}")

    def test_rejects_mismatched_lengths(self):
        with self.assertRaises(ValueError):
            train_regressor([[1.0], [2.0]], [1.0], feature_names=["x"])

    def test_rejects_empty_dataset(self):
        with self.assertRaises(ValueError):
            train_regressor([], [], feature_names=["x"])

    def test_deterministic_given_same_seed(self):
        features = [[float(x)] for x in range(10)]
        targets = [2 * x for x in range(10)]

        model_a = train_regressor(features, targets, feature_names=["x"], seed=3, epochs=100)
        model_b = train_regressor(features, targets, feature_names=["x"], seed=3, epochs=100)

        self.assertEqual(model_a.weights, model_b.weights)


if __name__ == "__main__":
    unittest.main()
