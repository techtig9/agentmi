"""
Minimal training service, stdlib http.server only (no fastapi/uvicorn —
those need `pip install`, which needs network this environment doesn't
have). Swapping to FastAPI later is a drop-in: the request/response JSON
shape here IS the API contract Next.js's ML agent builder calls against,
so upgrading the server internals doesn't require changing the caller.

Run: python3 server.py [port]   (default port 8000)

Endpoints:
  POST /train   {"task": "classification"|"regression", "features": [[float,...]],
                 "labels": [int,...] (classification) | "targets": [float,...] (regression),
                 "feature_names": [str,...], "test_fraction": float (default 0.2)}
  GET  /health
"""
import json
import random
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

from logistic_regression import train_classifier
from multiclass_logistic_regression import train_multiclass_classifier
from linear_regression import train_regressor


def _split(features, labels, test_fraction, seed=42):
    rng = random.Random(seed)
    indices = list(range(len(features)))
    rng.shuffle(indices)
    test_size = round(len(indices) * test_fraction)
    test_idx = set(indices[:test_size])
    train_f, train_l, test_f, test_l = [], [], [], []
    for i in indices:
        if i in test_idx:
            test_f.append(features[i])
            test_l.append(labels[i])
        else:
            train_f.append(features[i])
            train_l.append(labels[i])
    return train_f, train_l, test_f, test_l


def _classification_metrics(actual, predicted):
    tp = sum(1 for a, p in zip(actual, predicted) if a == 1 and p == 1)
    fp = sum(1 for a, p in zip(actual, predicted) if a == 0 and p == 1)
    tn = sum(1 for a, p in zip(actual, predicted) if a == 0 and p == 0)
    fn = sum(1 for a, p in zip(actual, predicted) if a == 1 and p == 0)
    accuracy = (tp + tn) / len(actual) if actual else 0
    precision = tp / (tp + fp) if (tp + fp) else 0
    recall = tp / (tp + fn) if (tp + fn) else 0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0
    return {"accuracy": round(accuracy, 4), "precision": round(precision, 4),
            "recall": round(recall, 4), "f1": round(f1, 4)}


def _multiclass_metrics(actual, predicted, class_labels):
    # Macro-averaged: compute precision/recall/F1 per class (that class
    # vs. all others, same framing as the one-vs-rest training), then
    # average unweighted across classes — treats every class as equally
    # important regardless of how many rows it has.
    accuracy = sum(1 for a, p in zip(actual, predicted) if a == p) / len(actual) if actual else 0

    per_class = []
    for k in class_labels:
        tp = sum(1 for a, p in zip(actual, predicted) if a == k and p == k)
        fp = sum(1 for a, p in zip(actual, predicted) if a != k and p == k)
        fn = sum(1 for a, p in zip(actual, predicted) if a == k and p != k)
        precision = tp / (tp + fp) if (tp + fp) else 0
        recall = tp / (tp + fn) if (tp + fn) else 0
        f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0
        per_class.append((precision, recall, f1))

    n = len(per_class) or 1
    macro_precision = sum(p for p, _, _ in per_class) / n
    macro_recall = sum(r for _, r, _ in per_class) / n
    macro_f1 = sum(f for _, _, f in per_class) / n

    return {
        "accuracy": round(accuracy, 4),
        "macro_precision": round(macro_precision, 4),
        "macro_recall": round(macro_recall, 4),
        "macro_f1": round(macro_f1, 4),
    }


def _regression_metrics(actual, predicted):
    n = len(actual)
    mae = sum(abs(a - p) for a, p in zip(actual, predicted)) / n
    rmse = (sum((a - p) ** 2 for a, p in zip(actual, predicted)) / n) ** 0.5
    return {"mae": round(mae, 4), "rmse": round(rmse, 4)}


def handle_train(payload: dict) -> dict:
    task = payload.get("task")
    features = payload["features"]
    feature_names = payload["feature_names"]
    test_fraction = payload.get("test_fraction", 0.2)

    if task == "classification":
        labels = payload["labels"]
        train_f, train_l, test_f, test_l = _split(features, labels, test_fraction)
        distinct_labels = sorted(set(labels))

        if len(distinct_labels) > 2:
            model = train_multiclass_classifier(train_f, train_l, feature_names)
            predictions = [model.predict(row) for row in test_f]
            metrics = _multiclass_metrics(test_l, predictions, model.class_labels) if test_l else {}
            return {
                "model": {
                    "type": "multiclass_logistic_regression",
                    "class_labels": model.class_labels,
                    "classifiers": [
                        {"class_label": label, "weights": m.weights, "bias": m.bias}
                        for label, m in zip(model.class_labels, model.class_models)
                    ],
                    "feature_means": model.feature_means,
                    "feature_stds": model.feature_stds,
                    "feature_names": model.feature_names,
                },
                "metrics": metrics,
            }

        model = train_classifier(train_f, train_l, feature_names)
        predictions = [model.predict(row) for row in test_f]
        metrics = _classification_metrics(test_l, predictions) if test_l else {}
        return {
            "model": {"type": "logistic_regression", "weights": model.weights, "bias": model.bias,
                      "feature_means": model.feature_means, "feature_stds": model.feature_stds,
                      "feature_names": model.feature_names},
            "metrics": metrics,
        }

    if task == "regression":
        targets = payload["targets"]
        train_f, train_t, test_f, test_t = _split(features, targets, test_fraction)
        model = train_regressor(train_f, train_t, feature_names)
        predictions = [model.predict(row) for row in test_f]
        metrics = _regression_metrics(test_t, predictions) if test_t else {}
        return {
            "model": {"type": "linear_regression", "weights": model.weights, "bias": model.bias,
                      "feature_means": model.feature_means, "feature_stds": model.feature_stds,
                      "feature_names": model.feature_names},
            "metrics": metrics,
        }

    raise ValueError(f"unknown task: {task!r} (expected 'classification' or 'regression')")


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, status: int, body: dict):
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {"status": "ok"})
        else:
            self._send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/train":
            self._send_json(404, {"error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length))
            result = handle_train(payload)
            self._send_json(200, result)
        except (KeyError, ValueError) as e:
            self._send_json(400, {"error": str(e)})
        except Exception as e:  # noqa: BLE001 — last-resort guard so a bad request never 500s silently
            self._send_json(500, {"error": f"internal error: {e}"})

    def log_message(self, format, *args):
        pass  # quiet by default; re-enable for local debugging


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"training-service listening on :{port}")
    server.serve_forever()
