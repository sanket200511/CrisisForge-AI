"""
CrisisForge AI — FastAPI Backend
Healthcare Resource Allocation Simulator & Decision Intelligence API
Includes security boundaries, audit logging, and clinical validation invariants.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Literal

from fastapi import FastAPI, HTTPException, Query, status, Request, Depends
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

from config import settings
from security import get_current_user, UserContext, sanitize_log_data
from prediction_engine import predict_patient_inflow, predict_resource_consumption
from simulation_engine import run_simulation
from allocation_strategies import STRATEGIES
from data_generator import generate_hospitals, generate_historical_data, generate_preset_scenarios
from transfer_engine import recommend_transfers
from ml_model import get_model
from telegram_bot import (
    format_alert_message, format_transfer_message,
    send_telegram_message, generate_capacity_alerts, get_bot_status,
    autonomous_monitor,
)
from database import init_db, log_audit_event, AuditLog, SessionLocal, is_sqlite

logger = logging.getLogger(__name__)


# ─── Lifespan Context Manager ───

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        init_db()
    except Exception as exc:
        logger.error(f"Database initialization error: {exc}")

    try:
        get_model()
    except Exception as exc:
        logger.warning(f"ML model pre-loading warning: {exc}")

    monitor_task = asyncio.create_task(autonomous_monitor())
    yield
    # Shutdown
    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass


# ─── App Setup ───

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ─── Global Exception Handlers ───

from fastapi.encoders import jsonable_encoder

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "status_code": 422,
            "details": jsonable_encoder(exc.errors()),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP Error",
            "status_code": exc.status_code,
            "detail": exc.detail,
        },
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "detail": "An unexpected error occurred while processing the request.",
        },
    )


# ─── Pydantic Schemas ───

CrisisType = Literal["pandemic", "earthquake", "flood", "staff_shortage", "none"]
StrategyKey = Literal["fcfs", "severity", "equity", "optimized"]


class ScenarioRequest(BaseModel):
    crisis_type: CrisisType = Field(default="pandemic", description="Disaster archetype")
    duration_days: int = Field(default=30, ge=7, le=180, description="Simulation duration in days")
    surge_multiplier: float = Field(default=2.0, ge=1.0, le=5.0, description="Patient inflow surge factor")
    base_daily_patients: float = Field(default=40.0, ge=5.0, le=200.0, description="Baseline daily admissions")
    hospital_beds: int = Field(default=200, ge=10, le=2000, description="Facility regular beds")
    hospital_icu: int = Field(default=30, ge=1, le=500, description="Facility ICU beds")
    hospital_ventilators: int = Field(default=20, ge=1, le=300, description="Facility mechanical ventilators")
    strategies: Optional[List[StrategyKey]] = Field(
        default=None,
        description="Subset of allocation strategies to run (fcfs, severity, equity, optimized)",
    )

    @model_validator(mode="after")
    def validate_hospital_capacity_invariants(self):
        """Clinical Invariant: ICU beds cannot exceed total hospital bed complement."""
        if self.hospital_icu > self.hospital_beds:
            raise ValueError("hospital_icu cannot exceed total hospital_beds complement.")
        if self.hospital_ventilators > self.hospital_icu * 2:
            raise ValueError("hospital_ventilators cannot exceed twice the ICU bed complement.")
        return self


class PredictionRequest(BaseModel):
    days: int = Field(default=30, ge=7, le=180, description="Forecasting horizon")
    base_daily: float = Field(default=40.0, ge=5.0, le=200.0, description="Baseline daily admissions")
    crisis_type: Optional[CrisisType] = Field(default=None, description="Disaster archetype")
    surge_multiplier: float = Field(default=2.0, ge=1.0, le=5.0, description="Peak surge multiplier")


class PatientPredictionRequest(BaseModel):
    age: float = Field(default=50.0, ge=0.5, le=120.0, description="Patient age in years")
    gender: int = Field(default=0, ge=0, le=1, description="0=Female, 1=Male")
    severity_score: float = Field(default=5.0, ge=1.0, le=10.0, description="Clinical triage acuity (1-10)")
    respiratory_rate: float = Field(default=18.0, ge=6.0, le=60.0, description="Breaths per minute")
    heart_rate: float = Field(default=80.0, ge=30.0, le=220.0, description="Beats per minute")
    spo2: float = Field(default=95.0, ge=50.0, le=100.0, description="Blood oxygen saturation %")
    temperature: float = Field(default=37.0, ge=32.0, le=43.0, description="Core temperature in Celsius")
    systolic_bp: float = Field(default=120.0, ge=50.0, le=260.0, description="Systolic blood pressure mmHg")
    has_comorbidity: int = Field(default=0, ge=0, le=1)
    comorbidity_count: int = Field(default=0, ge=0, le=5)
    days_since_symptom_onset: float = Field(default=3.0, ge=0.0, le=30.0)
    is_icu_candidate: int = Field(default=0, ge=0, le=1)
    crisis_day: float = Field(default=15.0, ge=1.0, le=180.0)
    hospital_bed_occupancy: float = Field(default=0.7, ge=0.0, le=1.0)
    hospital_icu_occupancy: float = Field(default=0.6, ge=0.0, le=1.0)


class TelegramRequest(BaseModel):
    bot_token: str = Field(default="", description="Optional Telegram bot token override")
    chat_id: str = Field(default="", description="Optional Telegram chat ID override")
    message_type: Literal["alerts", "transfers", "custom"] = Field(default="alerts")
    custom_message: str = Field(default="", max_length=2000)


# ═══════════════════════════════════════════════════
#  CORE API ROUTES
# ═══════════════════════════════════════════════════

@app.get("/", tags=["System"])
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "tagline": "Forging Smarter Decisions — Before the Crisis Hits.",
        "features": [
            "Predictive Inflow Modeling (Trend + Harmonics + Monte Carlo)",
            "Discrete-Event Crisis Simulation Engine",
            "4 Resource Allocation Strategies (FCFS, Severity, Equity, Greedy Acuity-Cost)",
            "Inter-Hospital Transfer Redistribution (Composite Strain Scoring)",
            "ML Patient Outcome & Resource Prediction (scikit-learn Gradient Boosting)",
            "Baseline Feature Perturbation Interpretability",
            "Telegram Crisis Alerts",
            "Clinical Decision Audit Trail",
        ],
        "security": {
            "auth_enabled": settings.AUTH_ENABLED,
            "audit_logging_enabled": settings.AUDIT_LOGGING_ENABLED,
            "database_dialect": "sqlite" if is_sqlite else "postgresql",
        },
        "endpoints": {
            "core": ["/api/hospitals", "/api/predict", "/api/simulate", "/api/scenarios", "/api/strategies"],
            "advanced": ["/api/transfers", "/api/ml/predict", "/api/ml/explain", "/api/ml/importance", "/api/telegram/send"],
            "dashboard": ["/api/dashboard-summary", "/api/historical"],
            "security": ["/api/security/status", "/api/audit-logs"],
        },
    }


@app.get("/api/hospitals", tags=["Core"])
def get_hospitals(count: int = Query(default=6, ge=1, le=8)):
    return {"hospitals": generate_hospitals(count)}


@app.post("/api/predict", tags=["Core"])
def predict(req: PredictionRequest, user: UserContext = Depends(get_current_user)):
    forecast = predict_patient_inflow(
        days=req.days,
        base_daily=req.base_daily,
        crisis_type=req.crisis_type,
        surge_multiplier=req.surge_multiplier,
    )
    resources = predict_resource_consumption(forecast["mean"])
    return {"inflow": forecast, "resources": resources}


@app.post("/api/simulate", tags=["Core"])
def simulate(req: ScenarioRequest, user: UserContext = Depends(get_current_user)):
    selected_strategies = list(req.strategies) if req.strategies else list(STRATEGIES.keys())
    result = run_simulation(
        crisis_type=req.crisis_type,
        duration_days=req.duration_days,
        surge_multiplier=req.surge_multiplier,
        base_daily_patients=req.base_daily_patients,
        hospital_beds=req.hospital_beds,
        hospital_icu=req.hospital_icu,
        hospital_ventilators=req.hospital_ventilators,
        strategies=selected_strategies,
    )

    log_audit_event(
        action="SIMULATION_EXECUTED",
        resource_type="simulation",
        user_id=user.uid,
        details={
            "crisis_type": req.crisis_type,
            "duration_days": req.duration_days,
            "surge_multiplier": req.surge_multiplier,
            "strategies_evaluated": selected_strategies,
        },
    )

    return result


@app.get("/api/scenarios", tags=["Core"])
def get_scenarios():
    return {"scenarios": generate_preset_scenarios()}


@app.get("/api/strategies", tags=["Core"])
def get_strategies():
    return {
        "strategies": [
            {"key": k, "name": v["name"], "color": v["color"]}
            for k, v in STRATEGIES.items()
        ]
    }


@app.get("/api/historical", tags=["Core"])
def get_historical(days: int = Query(default=90, ge=7, le=365)):
    return {"data": generate_historical_data(days)}


@app.get("/api/dashboard-summary", tags=["Core"])
def dashboard_summary():
    hospitals = generate_hospitals(6)
    historical = generate_historical_data(30)

    total_beds = sum(h["total_beds"] for h in hospitals)
    occupied_beds = sum(h["occupied_beds"] for h in hospitals)
    total_icu = sum(h["icu_beds"] for h in hospitals)
    occupied_icu = sum(h["occupied_icu"] for h in hospitals)
    total_vents = sum(h["ventilators"] for h in hospitals)
    vents_in_use = sum(h["ventilators_in_use"] for h in hospitals)
    total_staff = sum(h["total_staff"] for h in hospitals)
    active_staff = sum(h["active_staff"] for h in hospitals)

    return {
        "hospitals_count": len(hospitals),
        "overview": {
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "bed_occupancy": round(occupied_beds / max(total_beds, 1) * 100, 1),
            "total_icu": total_icu,
            "occupied_icu": occupied_icu,
            "icu_occupancy": round(occupied_icu / max(total_icu, 1) * 100, 1),
            "total_ventilators": total_vents,
            "ventilators_in_use": vents_in_use,
            "ventilator_usage": round(vents_in_use / max(total_vents, 1) * 100, 1),
            "total_staff": total_staff,
            "active_staff": active_staff,
            "staff_utilization": round(active_staff / max(total_staff, 1) * 100, 1),
        },
        "recent_admissions": historical,
        "hospitals": hospitals,
        "alerts": _generate_alerts(hospitals),
    }


def _generate_alerts(hospitals):
    alerts = []
    for h in hospitals:
        bed_pct = h["occupied_beds"] / max(h["total_beds"], 1)
        icu_pct = h["occupied_icu"] / max(h["icu_beds"], 1)
        if bed_pct > 0.85:
            alerts.append({
                "level": "critical" if bed_pct > 0.95 else "warning",
                "hospital": h["name"],
                "message": f"Bed occupancy at {round(bed_pct * 100)}%",
                "type": "bed_capacity",
            })
        if icu_pct > 0.8:
            alerts.append({
                "level": "critical" if icu_pct > 0.9 else "warning",
                "hospital": h["name"],
                "message": f"ICU occupancy at {round(icu_pct * 100)}%",
                "type": "icu_capacity",
            })
    return alerts


# ═══════════════════════════════════════════════════
#  TRANSFER ENGINE ROUTES
# ═══════════════════════════════════════════════════

@app.get("/api/transfers", tags=["Transfers"])
def get_transfers(
    hospital_count: int = Query(default=6, ge=3, le=8),
    user: UserContext = Depends(get_current_user),
):
    """Recommend inter-hospital patient transfers to relieve overloaded facilities."""
    hospitals = generate_hospitals(hospital_count)
    result = recommend_transfers(hospitals)

    log_audit_event(
        action="TRANSFER_ANALYSIS",
        resource_type="transfers",
        user_id=user.uid,
        details={
            "facility_count": hospital_count,
            "recommended_transfers": len(result.get("recommended_transfers", [])),
            "total_patients_recommended": result.get("total_patients_to_transfer", 0),
        },
    )

    return result


# ═══════════════════════════════════════════════════
#  ML MODEL ROUTES
# ═══════════════════════════════════════════════════

@app.get("/api/ml/status", tags=["Machine Learning"])
def ml_status():
    """Get ML model training status, architecture type, and evaluation metrics."""
    model = get_model()
    return {
        "trained": model.is_trained,
        "model_type": "scikit-learn GradientBoosting (GBM)",
        "metrics": model.metrics,
        "features": model.metrics.get("features_used", 15),
    }


@app.post("/api/ml/predict", tags=["Machine Learning"])
def ml_predict(req: PatientPredictionRequest, user: UserContext = Depends(get_current_user)):
    """Predict patient outcome class and estimated resource consumption hours."""
    model = get_model()
    result = model.predict_patient(req.model_dump())

    log_audit_event(
        action="PATIENT_TRIAGE_PREDICTED",
        resource_type="ml",
        user_id=user.uid,
        details={
            "age": req.age,
            "severity_score": req.severity_score,
            "spo2": req.spo2,
            "predicted_outcome": result.get("predicted_outcome"),
            "risk_level": result.get("risk_level"),
            "predicted_hours": result.get("predicted_resource_hours"),
        },
    )

    return result


@app.post("/api/ml/explain", tags=["Machine Learning"])
def ml_explain(req: PatientPredictionRequest, user: UserContext = Depends(get_current_user)):
    """Generate baseline feature perturbation sensitivity attribution for a single patient prediction."""
    model = get_model()
    return model.explain_prediction(req.model_dump())


@app.get("/api/ml/importance", tags=["Machine Learning"])
def ml_feature_importance():
    """Get global MDI feature importance ranking from trained tree ensembles."""
    model = get_model()
    return model.get_feature_importance()


@app.post("/api/ml/predict-batch", tags=["Machine Learning"])
def ml_predict_batch(patients: List[PatientPredictionRequest], user: UserContext = Depends(get_current_user)):
    """Predict outcomes and resource hours for a batch of patients."""
    if not patients:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch list cannot be empty.",
        )
    model = get_model()
    predictions = model.predict_batch([p.model_dump() for p in patients])

    log_audit_event(
        action="BATCH_TRIAGE_PREDICTED",
        resource_type="ml",
        user_id=user.uid,
        details={"batch_size": len(patients)},
    )

    return {"predictions": predictions}


# ═══════════════════════════════════════════════════
#  TELEGRAM BOT ROUTES
# ═══════════════════════════════════════════════════

@app.get("/api/telegram/status", tags=["Alerts"])
def telegram_status():
    """Get Telegram bot configuration and threshold status."""
    return get_bot_status()


@app.post("/api/telegram/send", tags=["Alerts"])
async def telegram_send(req: TelegramRequest, user: UserContext = Depends(get_current_user)):
    """Dispatch a Telegram alert notification."""
    bot_token = req.bot_token or settings.TELEGRAM_BOT_TOKEN
    chat_id = req.chat_id or settings.TELEGRAM_CHAT_ID

    if not bot_token or not chat_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Telegram bot is not configured on the server and no credentials were provided in the request.",
        )

    hospitals = generate_hospitals(6)

    if req.message_type == "alerts":
        alerts = generate_capacity_alerts(hospitals)
        summary = {
            "total_hospitals": len(hospitals),
            "bed_occupancy": round(sum(h["occupied_beds"] for h in hospitals) / max(sum(h["total_beds"] for h in hospitals), 1) * 100, 1),
            "icu_occupancy": round(sum(h["occupied_icu"] for h in hospitals) / max(sum(h["icu_beds"] for h in hospitals), 1) * 100, 1),
            "ventilator_usage": round(sum(h["ventilators_in_use"] for h in hospitals) / max(sum(h["ventilators"] for h in hospitals), 1) * 100, 1),
        }
        message = format_alert_message(alerts, summary)
    elif req.message_type == "transfers":
        result = recommend_transfers(hospitals)
        message = format_transfer_message(result["recommended_transfers"])
    elif req.message_type == "custom":
        if not req.custom_message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom message content cannot be empty when message_type is 'custom'.",
            )
        message = f"🔥 *CrisisForge AI*\n\n{req.custom_message.strip()}"
    else:
        message = format_alert_message([], {})

    result = await send_telegram_message(message, bot_token, chat_id)
    dispatch_success = bool(result.get("success"))

    log_audit_event(
        action="TELEGRAM_ALERT_DISPATCHED",
        resource_type="telegram",
        user_id=user.uid,
        details=sanitize_log_data({"message_type": req.message_type, "recipient_chat_id": chat_id}),
        status="SUCCESS" if dispatch_success else "FAILED",
    )

    if not dispatch_success:
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={"result": result, "message_preview": message[:500]},
        )

    return {"result": result, "message_preview": message[:500]}


@app.get("/api/telegram/preview", tags=["Alerts"])
def telegram_preview(message_type: Literal["alerts", "transfers", "custom"] = Query(default="alerts")):
    """Preview formatted Telegram alert message markdown."""
    hospitals = generate_hospitals(6)

    if message_type == "alerts":
        alerts = generate_capacity_alerts(hospitals)
        summary = {
            "total_hospitals": len(hospitals),
            "bed_occupancy": round(sum(h["occupied_beds"] for h in hospitals) / max(sum(h["total_beds"] for h in hospitals), 1) * 100, 1),
            "icu_occupancy": round(sum(h["occupied_icu"] for h in hospitals) / max(sum(h["icu_beds"] for h in hospitals), 1) * 100, 1),
            "ventilator_usage": round(sum(h["ventilators_in_use"] for h in hospitals) / max(sum(h["ventilators"] for h in hospitals), 1) * 100, 1),
        }
        message = format_alert_message(alerts, summary)
    elif message_type == "transfers":
        result = recommend_transfers(hospitals)
        message = format_transfer_message(result["recommended_transfers"])
    else:
        message = "Preview not available for this message type."

    return {"preview": message}


# ═══════════════════════════════════════════════════
#  SECURITY & AUDITABILITY ROUTES
# ═══════════════════════════════════════════════════

@app.get("/api/security/status", tags=["Security & Audit"])
def security_status(user: UserContext = Depends(get_current_user)):
    """Retrieve security configuration, authentication mode, and database dialect."""
    return {
        "auth_enabled": settings.AUTH_ENABLED,
        "caller_context": user.model_dump(),
        "audit_logging_enabled": settings.AUDIT_LOGGING_ENABLED,
        "cors_origins": settings.cors_origins,
        "database_dialect": "sqlite" if is_sqlite else "postgresql",
        "phi_protection": "Active: Synthetic data simulation only. No identifiable PHI is stored.",
    }


@app.get("/api/audit-logs", tags=["Security & Audit"])
def get_audit_logs(
    limit: int = Query(default=20, ge=1, le=100),
    user: UserContext = Depends(get_current_user),
):
    """Query recent operational and administrative decision audit events."""
    with SessionLocal() as session:
        records = session.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
        return {
            "count": len(records),
            "logs": [
                {
                    "id": r.id,
                    "timestamp": r.timestamp.isoformat() if r.timestamp else None,
                    "user_id": r.user_id,
                    "action": r.action,
                    "resource_type": r.resource_type,
                    "details": r.details,
                    "status": r.status,
                }
                for r in records
            ],
        }


@app.get("/health", tags=["System"])
def health():
    return {
        "status": "healthy",
        "service": "CrisisForge AI Backend",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }
