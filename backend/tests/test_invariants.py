"""
Tests for Healthcare Business Logic Safety & Invariants
Validates hard constraints: capacity bounds, physiological limits, transfer limits, and quantile monotonicity.
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from transfer_engine import recommend_transfers
from prediction_engine import predict_patient_inflow

client = TestClient(app)


def test_invariant_icu_cannot_exceed_total_hospital_beds():
    """ICU beds must be a subset of total hospital beds."""
    bad_payload = {
        "crisis_type": "pandemic",
        "duration_days": 14,
        "surge_multiplier": 2.0,
        "base_daily_patients": 40.0,
        "hospital_beds": 50,
        "hospital_icu": 100,  # Impossible: 100 ICU beds in 50-bed hospital
        "hospital_ventilators": 10,
    }
    resp = client.post("/api/simulate", json=bad_payload)
    assert resp.status_code == 422


def test_invariant_ventilators_cannot_exceed_twice_icu_capacity():
    """Ventilator complement cannot exceed reasonable ICU ratios."""
    bad_payload = {
        "crisis_type": "pandemic",
        "duration_days": 14,
        "surge_multiplier": 2.0,
        "base_daily_patients": 40.0,
        "hospital_beds": 200,
        "hospital_icu": 10,
        "hospital_ventilators": 50,  # 50 ventilators for only 10 ICU beds
    }
    resp = client.post("/api/simulate", json=bad_payload)
    assert resp.status_code == 422


def test_invariant_impossible_patient_physiology_rejected():
    """Reject clinically impossible vitals: SpO2 outside 50-100%, HR > 220, temp outside 32-43°C."""
    # Impossible SpO2 (> 100%)
    resp1 = client.post("/api/ml/predict", json={"spo2": 110.0})
    assert resp1.status_code == 422

    # Impossible SpO2 (< 50%)
    resp2 = client.post("/api/ml/predict", json={"spo2": 30.0})
    assert resp2.status_code == 422

    # Impossible core temperature (< 32°C)
    resp3 = client.post("/api/ml/predict", json={"temperature": 25.0})
    assert resp3.status_code == 422

    # Impossible systolic BP (< 50 mmHg)
    resp4 = client.post("/api/ml/predict", json={"systolic_bp": 20.0})
    assert resp4.status_code == 422


def test_invariant_transfers_never_exceed_receiver_capacity():
    """Transfers recommended must strictly be <= available capacity at the receiver."""
    mock_network = [
        # Sender: severe strain
        {
            "name": "Strained Center",
            "region": "Central",
            "lat": 21.14, "lng": 79.08,
            "total_beds": 100, "occupied_beds": 96,
            "icu_beds": 20, "occupied_icu": 20,
            "ventilators": 15, "ventilators_in_use": 15,
            "total_staff": 80, "active_staff": 78,
        },
        # Receiver: only 6 general beds and 2 ICU available
        {
            "name": "Small Clinic",
            "region": "Central",
            "lat": 21.15, "lng": 79.09,
            "total_beds": 20, "occupied_beds": 14,  # available beds = 6
            "icu_beds": 5, "occupied_icu": 3,       # available icu = 2
            "ventilators": 4, "ventilators_in_use": 1,
            "total_staff": 25, "active_staff": 10,
        },
    ]

    res = recommend_transfers(mock_network, pressure_threshold=75.0, min_receiving_capacity=5)
    transfers = res.get("recommended_transfers", [])

    for t in transfers:
        assert t["from_hospital"] != t["to_hospital"]
        assert t["patients_general"] <= 6
        assert t["patients_icu"] <= 2


def test_invariant_forecast_percentile_monotonicity_strict():
    """P10 <= P25 <= P75 <= P90 must hold on every simulated day."""
    result = predict_patient_inflow(days=45, base_daily=50.0, crisis_type="pandemic", surge_multiplier=3.0)
    p10 = result["p10"]
    p25 = result["p25"]
    p75 = result["p75"]
    p90 = result["p90"]

    for d in range(45):
        assert p10[d] <= p25[d] <= p75[d] <= p90[d]
