"""
Tests for Machine Learning Modules
Validates scikit-learn Gradient Boosting outcome classifier and baseline attribution.
"""

import pytest
from ml_model import get_model, CrisisForgeMLModel, generate_training_data, FEATURE_NAMES


def test_generate_training_data_shapes():
    features, outcomes, resources = generate_training_data(n_samples=200, seed=42)
    assert features.shape == (200, len(FEATURE_NAMES))
    assert outcomes.shape == (200,)
    assert resources.shape == (200,)
    assert set(outcomes).issubset({0, 1, 2, 3})


def test_ml_model_prediction_contract():
    model = get_model()
    patient = {
        "age": 68.0,
        "gender": 1,
        "severity_score": 8.5,
        "respiratory_rate": 28.0,
        "heart_rate": 115.0,
        "spo2": 88.0,
        "temperature": 38.6,
        "systolic_bp": 145.0,
        "has_comorbidity": 1,
        "comorbidity_count": 2,
        "days_since_symptom_onset": 6.0,
        "is_icu_candidate": 1,
        "crisis_day": 20.0,
        "hospital_bed_occupancy": 0.85,
        "hospital_icu_occupancy": 0.80,
    }

    pred = model.predict_patient(patient)
    assert pred["predicted_outcome"] in ["Discharged", "Admitted", "Critical", "Deceased"]
    assert pred["risk_level"] in ["Low", "Moderate", "Critical"]
    assert pred["predicted_resource_hours"] > 0

    probs = pred["outcome_probabilities"]
    prob_sum = sum(probs.values())
    # Should sum to approximately 100%
    assert 99.0 <= prob_sum <= 101.0


def test_ml_feature_importance_contract():
    model = get_model()
    importance = model.get_feature_importance()

    assert "feature_importance" in importance
    assert "top_predictors" in importance
    assert len(importance["feature_importance"]) == len(FEATURE_NAMES)
    assert len(importance["top_predictors"]) == 5
    assert importance["model_type"] == "scikit-learn GradientBoosting (GBM)"


def test_ml_explain_prediction_contract():
    model = get_model()
    patient = {
        "age": 75.0,
        "severity_score": 9.0,
        "spo2": 84.0,
        "is_icu_candidate": 1,
    }

    explanation = model.explain_prediction(patient)
    assert "prediction" in explanation
    assert "explanation" in explanation
    assert explanation["explanation"]["method"] == "Baseline Feature Perturbation Attribution"
    assert len(explanation["explanation"]["contributions"]) == len(FEATURE_NAMES)
