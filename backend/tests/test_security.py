"""
Tests for Security & Authentication Boundaries
Validates user context resolution, token requirement modes, RBAC, and log sanitization.
"""

import asyncio
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from config import settings
from security import (
    UserContext,
    sanitize_log_data,
    get_current_user,
    require_role,
)
from main import app

client = TestClient(app)


def test_sanitize_log_data_redacts_credentials():
    raw_payload = {
        "hospital": "AIIMS Nagpur",
        "bot_token": "1234567890:ABCdefGhI_SecretToken",
        "chat_id": "-1001234567890",
        "nested": {
            "api_key": "super_secret_key_12345",
            "normal_field": "public_data",
        },
    }

    sanitized = sanitize_log_data(raw_payload)

    assert sanitized["hospital"] == "AIIMS Nagpur"
    assert "SecretToken" not in sanitized["bot_token"]
    assert sanitized["bot_token"].startswith("123***")
    assert sanitized["chat_id"].startswith("-10***") and sanitized["chat_id"].endswith("90")
    assert "super_secret" not in sanitized["nested"]["api_key"]
    assert sanitized["nested"]["normal_field"] == "public_data"


def test_security_status_endpoint():
    resp = client.get("/api/security/status")
    assert resp.status_code == 200
    data = resp.json()

    assert "auth_enabled" in data
    assert "caller_context" in data
    assert "audit_logging_enabled" in data
    assert "cors_origins" in data
    assert "database_dialect" in data


def test_get_current_user_dev_mode_bypass():
    # In default dev mode (AUTH_ENABLED=False), missing credentials yields dev operator
    settings.AUTH_ENABLED = False
    user = asyncio.run(get_current_user(credentials=None))

    assert isinstance(user, UserContext)
    assert user.uid == "dev-local-operator"
    assert user.role == "admin"
    assert user.is_authenticated is False


def test_get_current_user_strict_mode_enforcement():
    # In strict mode (AUTH_ENABLED=True), missing credentials must raise HTTP 401
    settings.AUTH_ENABLED = True
    try:
        with pytest.raises(HTTPException) as exc_info:
            asyncio.run(get_current_user(credentials=None))
        assert exc_info.value.status_code == 401
    finally:
        # Restore dev mode
        settings.AUTH_ENABLED = False


def test_require_role_rbac_logic():
    admin_user = UserContext(uid="u1", role="admin", is_authenticated=True)
    clinician_user = UserContext(uid="u2", role="clinician", is_authenticated=True)
    dispatcher_user = UserContext(uid="u3", role="dispatcher", is_authenticated=True)

    clinician_checker = require_role(["clinician"])

    # Admin always passes
    assert asyncio.run(clinician_checker(admin_user)) == admin_user
    # Clinician passes
    assert asyncio.run(clinician_checker(clinician_user)) == clinician_user
    # Dispatcher fails
    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(clinician_checker(dispatcher_user))
    assert exc_info.value.status_code == 403
