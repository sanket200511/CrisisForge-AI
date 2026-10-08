"""
CrisisForge AI — Application Configuration
Centralized configuration management with environment variable overrides.
"""

import os
from pathlib import Path
from typing import List


class Settings:
    PROJECT_NAME: str = "CrisisForge AI"
    VERSION: str = "2.2.0"
    DESCRIPTION: str = "Healthcare Resource Allocation Simulator — Predict, Simulate, Compare, Act."
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'crisisforge.db'}")
    MODEL_PATH: Path = BASE_DIR / os.getenv("MODEL_FILE_NAME", "crisisforge_model.joblib")
    DATASET_PATH: Path = BASE_DIR / os.getenv("DATASET_FILE_NAME", "crisisforge_patient_data.csv")

    # Security & Authentication boundaries
    # In development, AUTH_ENABLED defaults to False allowing demo bypass.
    # In production, set AUTH_ENABLED=true to enforce verified Bearer tokens on sensitive endpoints.
    AUTH_ENABLED: bool = os.getenv("AUTH_ENABLED", "false").lower() == "true"
    API_AUTH_TOKEN: str = os.getenv("API_AUTH_TOKEN", "")  # Optional shared secret or developer key

    # Audit logging
    AUDIT_LOGGING_ENABLED: bool = os.getenv("AUDIT_LOGGING_ENABLED", "true").lower() == "true"

    # CORS configuration — default to local dev ports and production frontend domain
    _DEFAULT_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://crisisforge-ai.vercel.app",
    ]

    @property
    def cors_origins(self) -> List[str]:
        env_origins = os.getenv("ALLOWED_ORIGINS", "")
        if env_origins.strip():
            return [origin.strip() for origin in env_origins.split(",") if origin.strip()]
        return self._DEFAULT_ORIGINS

    # Telegram bot configuration
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")
    TELEGRAM_COOLDOWN_MINUTES: int = int(os.getenv("TELEGRAM_COOLDOWN_MINUTES", "5"))


settings = Settings()
