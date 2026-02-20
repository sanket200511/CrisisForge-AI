"""
CrisisForge AI — FastAPI Backend
Healthcare Resource Allocation Simulator API
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import asyncio

from prediction_engine import predict_patient_inflow, predict_resource_consumption
from simulation_engine import run_simulation
from allocation_strategies import STRATEGIES
from data_generator import generate_hospitals, generate_historical_data, generate_preset_scenarios
from transfer_engine import recommend_transfers
from ml_model import get_model
from telegram_bot import (
    format_alert_message, format_transfer_message, format_prediction_message,
    send_telegram_message, generate_capacity_alerts, get_bot_status,
    autonomous_monitor,
)
from database import init_db

# ─── App Setup ───
app = FastAPI(
    title="CrisisForge AI",
    description="Healthcare Resource Allocation Simulator — Predict, Simulate, Compare, Act.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    init_db()
    # Pre-train ML model in background
    try:
        get_model()
    except Exception:
        pass
    
    # Start the autonomous Telegram monitoring loop
    asyncio.create_task(autonomous_monitor())


# ─── Pydantic Schemas ───

class ScenarioRequest(BaseModel):
    crisis_type: str = Field(default="pandemic")
    duration_days: int = Field(default=30, ge=7, le=180)
    surge_multiplier: float = Field(default=2.0, ge=1.0, le=5.0)
    base_daily_patients: float = Field(default=40.0, ge=5, le=200)
    hospital_beds: int = Field(default=200, ge=10, le=2000)
    hospital_icu: int = Field(default=30, ge=1, le=500)
    hospital_ventilators: int = Field(default=20, ge=1, le=300)
    strategies: Optional[List[str]] = None


class PredictionRequest(BaseModel):
    days: int = Field(default=30, ge=7, le=180)
    base_daily: float = Field(default=40.0, ge=5, le=200)
    crisis_type: Optional[str] = None
    surge_multiplier: float = Field(default=2.0, ge=1.0, le=5.0)


class PatientPredictionRequest(BaseModel):
    age: float = Field(default=50, ge=1, le=100)
    gender: int = Field(default=0, ge=0, le=1)
    severity_score: float = Field(default=5, ge=1, le=10)
    respiratory_rate: float = Field(default=18, ge=8, le=45)
    heart_rate: float = Field(default=80, ge=40, le=180)
    spo2: float = Field(default=95, ge=70, le=100)
    temperature: float = Field(default=37.0, ge=35, le=41)
    systolic_bp: float = Field(default=120, ge=70, le=200)
    has_comorbidity: int = Field(default=0, ge=0, le=1)
    comorbidity_count: int = Field(default=0, ge=0, le=5)
    days_since_symptom_onset: float = Field(default=3, ge=0, le=30)
    is_icu_candidate: int = Field(default=0, ge=0, le=1)
    crisis_day: float = Field(default=15, ge=1, le=180)
    hospital_bed_occupancy: float = Field(default=0.7, ge=0, le=1)
    hospital_icu_occupancy: float = Field(default=0.6, ge=0, le=1)


class TelegramRequest(BaseModel):
    bot_token: str = ""
    chat_id: str = ""
    message_type: str = Field(default="alerts", description="alerts | transfers | custom")
    custom_message: str = ""


# ═══════════════════════════════════════════════════
#  CORE API ROUTES
# ═══════════════════════════════════════════════════

@app.get("/")
def root():
    return {
        "name": "CrisisForge AI",
        "version": "2.0.0",
        "tagline": "Forging Smarter Decisions — Before the Crisis Hits.",
        "features": [
            "Predictive Modeling (ARIMA + Monte Carlo)",
            "Crisis Simulation Engine",
            "4 Allocation Strategies",
            "Inter-Hospital Transfer Optimization",
            "ML Patient Outcome Prediction (SHAP)",
            "Telegram Crisis Alerts",
        ],
        "endpoints": {
            "core": ["/api/hospitals", "/api/predict", "/api/simulate", "/api/scenarios", "/api/strategies"],
            "advanced": ["/api/transfers", "/api/ml/predict", "/api/ml/explain", "/api/ml/importance", "/api/telegram/send"],
            "dashboard": ["/api/dashboard-summary", "/api/historical"],
        },
    }


@app.get("/api/hospitals")
def get_hospitals(count: int = Query(default=6, ge=1, le=8)):
    return {"hospitals": generate_hospitals(count)}


@app.post("/api/predict")
def predict(req: PredictionRequest):
    forecast = predict_patient_inflow(
        days=req.days, base_daily=req.base_daily,
        crisis_type=req.crisis_type, surge_multiplier=req.surge_multiplier,
    )
    resources = predict_resource_consumption(forecast["mean"])
    return {"inflow": forecast, "resources": resources}


@app.post("/api/simulate")
def simulate(req: ScenarioRequest):
    return run_simulation(
        crisis_type=req.crisis_type, duration_days=req.duration_days,
        surge_multiplier=req.surge_multiplier, base_daily_patients=req.base_daily_patients,
        hospital_beds=req.hospital_beds, hospital_icu=req.hospital_icu,
        hospital_ventilators=req.hospital_ventilators, strategies=req.strategies,
    )


@app.get("/api/scenarios")
def get_scenarios():
    return {"scenarios": generate_preset_scenarios()}


@app.get("/api/strategies")
def get_strategies():
    return {
        "strategies": [
            {"key": k, "name": v["name"], "color": v["color"]}
            for k, v in STRATEGIES.items()
        ]
    }


@app.get("/api/historical")
def get_historical(days: int = Query(default=90, ge=7, le=365)):
    return {"data": generate_historical_data(days)}


@app.get("/api/dashboard-summary")
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
            alerts.append({"level": "critical" if bed_pct > 0.95 else "warning", "hospital": h["name"], "message": f"Bed occupancy at {round(bed_pct*100)}%", "type": "bed_capacity"})
        if icu_pct > 0.8:
            alerts.append({"level": "critical" if icu_pct > 0.9 else "warning", "hospital": h["name"], "message": f"ICU occupancy at {round(icu_pct*100)}%", "type": "icu_capacity"})
    return alerts


# ═══════════════════════════════════════════════════
#  TRANSFER ENGINE ROUTES
# ═══════════════════════════════════════════════════

@app.get("/api/transfers")
def get_transfers(hospital_count: int = Query(default=6, ge=3, le=8)):
    """Recommend optimal inter-hospital patient transfers."""
    hospitals = generate_hospitals(hospital_count)
    return recommend_transfers(hospitals)


# ═══════════════════════════════════════════════════
#  ML MODEL ROUTES
# ═══════════════════════════════════════════════════

@app.get("/api/ml/status")
def ml_status():
    """Get ML model training status and metrics."""
    model = get_model()
    return {
        "trained": model.is_trained,
        "metrics": model.metrics,
        "features": model.metrics.get("features_used", 15),
    }


@app.post("/api/ml/predict")
def ml_predict(req: PatientPredictionRequest):
    """Predict patient outcome using ML model."""
    model = get_model()
    return model.predict_patient(req.model_dump())


@app.post("/api/ml/explain")
def ml_explain(req: PatientPredictionRequest):
    """Get SHAP-like explanation for a patient prediction."""
    model = get_model()
    return model.explain_prediction(req.model_dump())


@app.get("/api/ml/importance")
def ml_feature_importance():
    """Get feature importance from the trained model."""
    model = get_model()
    return model.get_feature_importance()


@app.post("/api/ml/predict-batch")
def ml_predict_batch(patients: List[PatientPredictionRequest]):
    """Predict outcomes for a batch of patients."""
    model = get_model()
    return {"predictions": model.predict_batch([p.model_dump() for p in patients])}


# ═══════════════════════════════════════════════════
#  TELEGRAM BOT ROUTES
# ═══════════════════════════════════════════════════

@app.get("/api/telegram/status")
def telegram_status():
    """Get Telegram bot configuration status."""
    return get_bot_status()


@app.post("/api/telegram/send")
async def telegram_send(req: TelegramRequest):
    """Send a Telegram alert."""
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
    elif req.message_type == "custom" and req.custom_message:
        message = f"🔥 *CrisisForge AI*\n\n{req.custom_message}"
    else:
        message = format_alert_message([], {})

    result = await send_telegram_message(message, req.bot_token, req.chat_id)
    return {"result": result, "message_preview": message[:500]}


@app.get("/api/telegram/preview")
def telegram_preview(message_type: str = Query(default="alerts")):
    """Preview what the Telegram message would look like."""
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


@app.get("/health")
def health():
    return {"status": "healthy", "service": "CrisisForge AI Backend", "version": "2.0.0"}
