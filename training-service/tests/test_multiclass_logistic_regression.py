import unittest
from multiclass_logistic_regression import train_multiclass_classifier


def make_three_cluster_dataset():
    # Three well-separated clusters in 2D: class 0 near (0,0), class 1
    # near (10,0), class 2 near (5,10) — an equilateral-ish triangle, so
    # no two classes are trivially confusable with each other.
    features, labels = [], []
    for x, y in [(0, 0), (1, 1), (0, 1), (1, 0), (0.5, 0.5)]:
        features.append([x, y])
        labels.append(0)
    for x, y in [(10, 0), (11, 1), (10, 1), (11, 0), (10.5, 0.5)]:
        features.append([x, y])
        labels.append(1)
    for x, y in [(5, 10), (6, 11), (5, 11), (6, 10), (5.5, 10.5)]:
        features.append([x, y])
        labels.append(2)
    return features, labels


class TestMulticlassLogisticRegression(unittest.TestCase):
    def test_correctly_classifies_three_well_separated_clusters(self):
        features, labels = make_three_cluster_dataset()
        model = train_multiclass_classifier(features, labels, ["x", "y"])

        # Test on the exact training points — with clusters this separated,
        # a correctly-trained model should get all of them right.
        correct = sum(1 for f, l in zip(features, labels) if model.predict(f) == l)
        self.assertEqual(correct, len(features))

    def test_predicts_correct_class_for_a_clear_new_point_per_cluster(self):
        features, labels = make_three_cluster_dataset()
        model = train_multiclass_classifier(features, labels, ["x", "y"])

        self.assertEqual(model.predict([0.2, 0.2]), 0)
        self.assertEqual(model.predict([10.2, 0.2]), 1)
        self.assertEqual(model.predict([5.2, 10.2]), 2)

    def test_class_labels_are_sorted_and_index_aligned_with_class_models(self):
        features, labels = make_three_cluster_dataset()
        model = train_multiclass_classifier(features, labels, ["x", "y"])
        self.assertEqual(model.class_labels, [0, 1, 2])
        self.assertEqual(len(model.class_models), 3)

    def test_predict_scores_returns_one_score_per_class(self):
        features, labels = make_three_cluster_dataset()
        model = train_multiclass_classifier(features, labels, ["x", "y"])
        scores = model.predict_scores([0, 0])
        self.assertEqual(len(scores), 3)
        self.assertTrue(all(0 <= s <= 1 for s in scores))

    def test_rejects_fewer_than_three_classes(self):
        features = [[0, 0], [1, 1], [2, 2], [3, 3]]
        labels = [0, 0, 1, 1]  # only 2 distinct classes
        with self.assertRaises(ValueError):
            train_multiclass_classifier(features, labels, ["x", "y"])

    def test_rejects_more_than_twenty_classes(self):
        features = [[i, i] for i in range(25)]
        labels = list(range(25))  # 25 distinct "classes" — looks like an ID column
        with self.assertRaises(ValueError):
            train_multiclass_classifier(features, labels, ["x", "y"])

    def test_rejects_mismatched_lengths(self):
        with self.assertRaises(ValueError):
            train_multiclass_classifier([[0, 0], [1, 1]], [0, 1, 2], ["x", "y"])

    def test_rejects_empty_dataset(self):
        with self.assertRaises(ValueError):
            train_multiclass_classifier([], [], ["x", "y"])

    def test_deterministic_given_same_seed(self):
        features, labels = make_three_cluster_dataset()
        model_a = train_multiclass_classifier(features, labels, ["x", "y"], seed=7)
        model_b = train_multiclass_classifier(features, labels, ["x", "y"], seed=7)
        for ma, mb in zip(model_a.class_models, model_b.class_models):
            self.assertEqual(ma.weights, mb.weights)
            self.assertEqual(ma.bias, mb.bias)

    def test_shared_standardization_is_identical_across_all_class_models(self):
        # Standardization only depends on features, never on which
        # one-vs-rest sub-problem is being solved — every class model
        # should report the exact same means/stds.
        features, labels = make_three_cluster_dataset()
        model = train_multiclass_classifier(features, labels, ["x", "y"])
        first_means = model.class_models[0].feature_means
        for m in model.class_models[1:]:
            self.assertEqual(m.feature_means, first_means)


if __name__ == "__main__":
    unittest.main()
