"""
CrisisForge AI — Model and Dataset Export Script
Exports trained scikit-learn models to .joblib and generates reference synthetic dataset.
"""

import os
import sys
import csv
import joblib
from pathlib import Path

# Fix Windows console UTF-8 output if possible
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from config import settings
from ml_model import CrisisForgeMLModel, generate_training_data, FEATURE_NAMES


def export_model_and_data(n_samples: int = 5000):
    print("Generating dataset and training model...")
    model = CrisisForgeMLModel()
    model.train(n_samples=n_samples)

    export_path = settings.MODEL_PATH
    joblib.dump({
        "outcome_model": model.outcome_model,
        "resource_model": model.resource_model,
        "features": FEATURE_NAMES,
        "metrics": model.metrics,
    }, export_path)

    print(f"[OK] ML Model successfully exported to: {os.path.abspath(export_path)}")

    # Generate reference dataset and save to CSV
    X, y_outcome, y_resource = generate_training_data(n_samples=n_samples, seed=42)
    csv_path = settings.DATASET_PATH

    with open(csv_path, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        headers = FEATURE_NAMES + ["outcome_label", "resource_hours_needed"]
        writer.writerow(headers)

        for i in range(len(X)):
            row = list(X[i]) + [int(y_outcome[i]), round(float(y_resource[i]), 1)]
            writer.writerow(row)

    print(f"[OK] Training Dataset successfully exported to: {os.path.abspath(csv_path)}")


if __name__ == "__main__":
    export_model_and_data()
