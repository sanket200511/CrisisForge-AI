"""
CrisisForge AI - Database Setup
SQLite database with SQLAlchemy for scenarios, hospitals, and simulation results.
"""

from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, JSON, ForeignKey, Text
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./crisisforge.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


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
    created_at = Column(DateTime, default=datetime.utcnow)


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    crisis_type = Column(String, nullable=False)  # pandemic, earthquake, flood, staff_shortage
    duration_days = Column(Integer, default=30)
    surge_multiplier = Column(Float, default=2.0)
    parameters = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    strategy = Column(String, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    timeline = Column(JSON, default=list)       # day-by-day metrics
    summary = Column(JSON, default=dict)         # aggregate outcomes
    created_at = Column(DateTime, default=datetime.utcnow)


# ──────────────── DB HELPERS ────────────────

def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
