"""
CrisisForge AI — Database Setup & Audit Logging
Environment-driven database connection supporting SQLite and PostgreSQL.
Includes immutable clinical audit log table for resource management decisions.
"""

import logging
from typing import Optional, Dict
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

logger = logging.getLogger(__name__)

# Environment-driven database connection parameters
# SQLite requires check_same_thread=False for async/threaded FastAPI calls.
# PostgreSQL / MySQL do not support or require this argument.
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def _utcnow():
    return datetime.now(timezone.utc)


# ──────────────── ORM MODELS ────────────────

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    region = Column(String, default="Central")
    total_beds = Column(Integer, default=200)
    icu_beds = Column(Integer, default=30)
    ventilators = Column(Integer, default=20)
    total_staff = Column(Integer, default=150)
    occupied_beds = Column(Integer, default=0)
    occupied_icu = Column(Integer, default=0)
    ventilators_in_use = Column(Integer, default=0)
    active_staff = Column(Integer, default=0)
    created_at = Column(DateTime, default=_utcnow)


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    crisis_type = Column(String, nullable=False)  # pandemic, earthquake, flood, staff_shortage
    duration_days = Column(Integer, default=30)
    surge_multiplier = Column(Float, default=2.0)
    parameters = Column(JSON, default=dict)
    created_at = Column(DateTime, default=_utcnow)


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    strategy = Column(String, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    timeline = Column(JSON, default=list)       # day-by-day metrics
    summary = Column(JSON, default=dict)         # aggregate outcomes
    created_at = Column(DateTime, default=_utcnow)


class AuditLog(Base):
    """
    Immutable audit log for healthcare resource planning and administrative actions.
    Tracks critical system decisions (simulation execution, transfer recommendations, alerts).
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=_utcnow, index=True)
    user_id = Column(String, default="anonymous", index=True)
    action = Column(String, nullable=False, index=True)       # e.g. SIMULATION_RUN, TRANSFER_QUERY, ALERT_SENT
    resource_type = Column(String, nullable=False)            # e.g. simulation, transfer, telegram, ml
    details = Column(JSON, default=dict)                     # non-PHI operational metadata
    status = Column(String, default="SUCCESS")               # SUCCESS, FAILED


# ──────────────── DB HELPERS ────────────────

def init_db():
    """Create database tables if they do not exist."""
    Base.metadata.create_all(bind=engine)


# Auto-initialize database schema on load
init_db()


def get_db():
    """FastAPI database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def log_audit_event(
    action: str,
    resource_type: str,
    user_id: str = "anonymous",
    details: Optional[Dict] = None,
    status: str = "SUCCESS",
):
    """
    Lightweight, fail-safe audit logging helper.
    Logs clinical administrative and operational actions to the database.
    """
    if not settings.AUDIT_LOGGING_ENABLED:
        return

    try:
        with SessionLocal() as session:
            record = AuditLog(
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                details=details or {},
                status=status,
            )
            session.add(record)
            session.commit()
    except Exception as exc:
        logger.warning(f"Could not persist audit log event '{action}': {exc}")
