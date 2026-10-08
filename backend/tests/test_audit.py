"""
Tests for Clinical Audit Logging
Validates audit event persistence and decision query endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from database import log_audit_event, SessionLocal, AuditLog
from main import app

client = TestClient(app)


def test_direct_log_audit_event_persists():
    log_audit_event(
        action="TEST_ACTION_DIRECT",
        resource_type="unit_test",
        user_id="test-operator",
        details={"sample_key": "sample_val"},
        status="SUCCESS",
    )

    with SessionLocal() as session:
        record = session.query(AuditLog).filter_by(action="TEST_ACTION_DIRECT").first()
        assert record is not None
        assert record.user_id == "test-operator"
        assert record.resource_type == "unit_test"
        assert record.details.get("sample_key") == "sample_val"
        assert record.status == "SUCCESS"


def test_api_calls_trigger_audit_entries():
    # Calling simulation endpoint should log SIMULATION_EXECUTED
    payload = {
        "crisis_type": "pandemic",
        "duration_days": 10,
        "surge_multiplier": 1.5,
        "base_daily_patients": 30.0,
        "hospital_beds": 100,
        "hospital_icu": 20,
        "hospital_ventilators": 10,
        "strategies": ["fcfs"],
    }
    sim_resp = client.post("/api/simulate", json=payload)
    assert sim_resp.status_code == 200

    # Query audit logs endpoint
    audit_resp = client.get("/api/audit-logs?limit=10")
    assert audit_resp.status_code == 200
    data = audit_resp.json()
    assert "logs" in data
    assert any(log["action"] == "SIMULATION_EXECUTED" for log in data["logs"])
