"""
Integration Tests for FastAPI Endpoints
Validates API contracts, input validation errors, and proper HTTP response status codes.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_root_endpoint_metadata():
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert "endpoints" in data
    assert "features" in data


def test_hospitals_endpoint():
    resp = client.get("/api/hospitals?count=5")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["hospitals"]) == 5

    # Boundary test: count exceeds max of 8
    bad_resp = client.get("/api/hospitals?count=15")
    assert bad_resp.status_code == 422


def test_predict_endpoint_valid_and_invalid():
    # Valid
    payload = {
        "days": 14,
        "base_daily": 35.0,
        "crisis_type": "pandemic",
        "surge_multiplier": 2.2,
    }
    resp = client.post("/api/predict", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "inflow" in data
    assert "resources" in data

    # Invalid days (< 7)
    bad_payload = {**payload, "days": 3}
    bad_resp = client.post("/api/predict", json=bad_payload)
    assert bad_resp.status_code == 422


def test_simulate_endpoint_valid_and_invalid():
    # Valid
    payload = {
        "crisis_type": "earthquake",
        "duration_days": 15,
        "surge_multiplier": 2.5,
        "base_daily_patients": 40.0,
        "hospital_beds": 150,
        "hospital_icu": 25,
        "hospital_ventilators": 15,
        "strategies": ["fcfs", "optimized"],
    }
    resp = client.post("/api/simulate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "strategies" in data
    assert "fcfs" in data["strategies"]
    assert "optimized" in data["strategies"]

    # Invalid strategy name
    bad_payload = {**payload, "strategies": ["non_existent_strategy"]}
    bad_resp = client.post("/api/simulate", json=bad_payload)
    assert bad_resp.status_code == 422


def test_ml_predict_and_explain_endpoints():
    payload = {
        "age": 62.0,
        "severity_score": 7.0,
        "spo2": 91.0,
        "systolic_bp": 135.0,
    }

    pred_resp = client.post("/api/ml/predict", json=payload)
    assert pred_resp.status_code == 200
    assert "predicted_outcome" in pred_resp.json()

    explain_resp = client.post("/api/ml/explain", json=payload)
    assert explain_resp.status_code == 200
    assert "explanation" in explain_resp.json()


def test_ml_predict_batch_empty_rejected():
    resp = client.post("/api/ml/predict-batch", json=[])
    assert resp.status_code == 400


def test_telegram_send_without_credentials_rejected():
    payload = {
        "bot_token": "",
        "chat_id": "",
        "message_type": "alerts",
    }
    resp = client.post("/api/telegram/send", json=payload)
    # When tokens are omitted and not in environment, should reject with 400
    assert resp.status_code == 400


def test_telegram_status_and_preview():
    status_resp = client.get("/api/telegram/status")
    assert status_resp.status_code == 200

    preview_resp = client.get("/api/telegram/preview?message_type=alerts")
    assert preview_resp.status_code == 200
    assert "preview" in preview_resp.json()
