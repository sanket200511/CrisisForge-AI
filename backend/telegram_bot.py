"""
CrisisForge AI — Telegram Bot Integration
Provides crisis capacity notifications and patient load redistribution alerts.
"""

import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone
import httpx

from config import settings
from data_generator import generate_hospitals
from transfer_engine import recommend_transfers

logger = logging.getLogger(__name__)

# Alert state cache to prevent spamming operators during sustained crises
ALERT_HISTORY: Dict[str, datetime] = {}

# Capacity threshold triggers (percentage occupancies)
THRESHOLDS = {
    "bed_critical": 90,
    "bed_warning": 80,
    "icu_critical": 85,
    "icu_warning": 75,
    "ventilator_critical": 85,
    "staff_warning": 90,
}


def format_alert_message(alerts: List[Dict], summary: Dict) -> str:
    """Format capacity alerts into a structured Telegram markdown message."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    msg = "🔥 *CrisisForge AI Alert*\n"
    msg += f"📅 {now}\n\n"

    if summary:
        msg += "📊 *Network Overview*\n"
        msg += f"├ Hospitals: {summary.get('total_hospitals', 'N/A')}\n"
        msg += f"├ Bed Occ: {summary.get('bed_occupancy', 'N/A')}%\n"
        msg += f"├ ICU Occ: {summary.get('icu_occupancy', 'N/A')}%\n"
        msg += f"└ Ventilator: {summary.get('ventilator_usage', 'N/A')}%\n\n"

    if alerts:
        msg += f"⚠️ *Active Alerts ({len(alerts)})*\n"
        for a in alerts:
            icon = "🔴" if a.get("level") == "critical" else "🟡"
            msg += f"{icon} *{a.get('hospital')}*: {a.get('message')}\n"
    else:
        msg += "✅ All monitored facilities operate within normal capacity thresholds\n"

    msg += "\n🔗 Dashboard: http://localhost:5173"
    return msg


def format_transfer_message(transfers: List[Dict]) -> str:
    """Format inter-hospital transfer recommendations into a Telegram markdown message."""
    if not transfers:
        return "✅ No transfers recommended — network loads are balanced."

    msg = "🚑 *Patient Transfer Recommendations*\n\n"
    for t in transfers[:5]:
        priority_icon = "🔴" if t.get("priority") == "critical" else "🟡" if t.get("priority") == "high" else "🟢"
        msg += f"{priority_icon} *Transfer #{t.get('id')}*\n"
        msg += f"  📤 From: {t.get('from_hospital')} ({t.get('from_pressure')}% load)\n"
        msg += f"  📥 To: {t.get('to_hospital')} ({t.get('to_pressure')}% load)\n"
        msg += f"  👥 Patients: {t.get('total_patients')} ({t.get('patients_general')} general + {t.get('patients_icu')} ICU)\n"
        msg += f"  📏 Distance: {t.get('distance_km')}km (~{int(t.get('estimated_transfer_time_min', 0))}min)\n"
        msg += f"  📉 Pressure reduction: {t.get('pressure_reduction')}%\n\n"

    msg += f"Total patients recommended for transfer: {sum(t.get('total_patients', 0) for t in transfers)}"
    return msg


def format_prediction_message(prediction: Dict) -> str:
    """Format individual patient ML prediction summary into Telegram markdown."""
    msg = "🧠 *AI Prediction Result*\n\n"
    msg += f"🎯 Outcome: *{prediction.get('predicted_outcome', 'Unknown')}*\n"
    msg += f"⚠️ Risk Level: *{prediction.get('risk_level', 'Unknown')}*\n"
    msg += f"⏱️ Est. Resource Hours: {prediction.get('predicted_resource_hours', 0)}\n\n"

    probs = prediction.get("outcome_probabilities", {})
    msg += "📊 *Outcome Probabilities:*\n"
    msg += f"  ✅ Discharged: {probs.get('discharged', 0)}%\n"
    msg += f"  🏥 Admitted: {probs.get('admitted', 0)}%\n"
    msg += f"  ⚠️ Critical: {probs.get('critical', 0)}%\n"
    msg += f"  💀 Deceased: {probs.get('deceased', 0)}%\n"

    return msg


async def send_telegram_message(message: str, token: str = "", chat_id: str = "") -> Dict:
    """
    Send an asynchronous message via Telegram Bot API using httpx.
    Non-blocking async HTTP request.
    """
    token = token or settings.TELEGRAM_BOT_TOKEN
    chat_id = chat_id or settings.TELEGRAM_CHAT_ID

    if not token or not chat_id:
        return {
            "success": False,
            "error": "Telegram bot not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.",
            "message_preview": message[:200],
        }

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "Markdown",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return {"success": True, "message_id": data.get("result", {}).get("message_id")}
            else:
                return {
                    "success": False,
                    "status_code": resp.status_code,
                    "error": f"Telegram API returned HTTP {resp.status_code}: {resp.text[:200]}",
                }
    except Exception as exc:
        logger.error(f"Telegram dispatch failed: {exc}")
        return {"success": False, "error": str(exc)}


def generate_capacity_alerts(hospitals: List[Dict]) -> List[Dict]:
    """Generate threshold alert records from current facility capacity snapshot."""
    alerts = []

    for h in hospitals:
        total_beds = max(h.get("total_beds", 1), 1)
        icu_beds = max(h.get("icu_beds", 1), 1)
        vents = max(h.get("ventilators", 1), 1)

        bed_pct = round((h.get("occupied_beds", 0) / total_beds) * 100.0, 1)
        icu_pct = round((h.get("occupied_icu", 0) / icu_beds) * 100.0, 1)
        vent_pct = round((h.get("ventilators_in_use", 0) / vents) * 100.0, 1)

        name = h.get("name", "Unknown Facility")

        if bed_pct >= THRESHOLDS["bed_critical"]:
            alerts.append({"level": "critical", "hospital": name, "message": f"Bed occupancy at {bed_pct}%", "type": "bed"})
        elif bed_pct >= THRESHOLDS["bed_warning"]:
            alerts.append({"level": "warning", "hospital": name, "message": f"Bed occupancy at {bed_pct}%", "type": "bed"})

        if icu_pct >= THRESHOLDS["icu_critical"]:
            alerts.append({"level": "critical", "hospital": name, "message": f"ICU occupancy at {icu_pct}%", "type": "icu"})
        elif icu_pct >= THRESHOLDS["icu_warning"]:
            alerts.append({"level": "warning", "hospital": name, "message": f"ICU occupancy at {icu_pct}%", "type": "icu"})

        if vent_pct >= THRESHOLDS["ventilator_critical"]:
            alerts.append({"level": "critical", "hospital": name, "message": f"Ventilator usage at {vent_pct}%", "type": "ventilator"})

    return alerts


def get_bot_status() -> Dict:
    """Get Telegram integration configuration status."""
    return {
        "configured": bool(settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID),
        "bot_token_set": bool(settings.TELEGRAM_BOT_TOKEN),
        "chat_id_set": bool(settings.TELEGRAM_CHAT_ID),
        "thresholds": THRESHOLDS,
        "instructions": {
            "step_1": "Create a bot via @BotFather on Telegram",
            "step_2": "Set TELEGRAM_BOT_TOKEN environment variable",
            "step_3": "Obtain recipient chat ID via @userinfobot",
            "step_4": "Set TELEGRAM_CHAT_ID environment variable",
        },
    }


async def autonomous_monitor():
    """Background task monitoring regional capacity and issuing alerts on threshold breaches."""
    logger.info("Initializing Telegram autonomous monitoring task...")
    cooldown_seconds = settings.TELEGRAM_COOLDOWN_MINUTES * 60

    while True:
        try:
            # If not configured, sleep and recheck
            if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
                await asyncio.sleep(60)
                continue

            hospitals = generate_hospitals(8)
            now = datetime.now(timezone.utc)

            # 1. 95% Rule: Check for severe critical threshold requiring urgent network redistribution
            breached_hospitals = []
            for h in hospitals:
                occupancy = h.get("occupied_beds", 0) / max(h.get("total_beds", 1), 1)
                if occupancy >= 0.95:
                    alert_key = f"redistribution_{h.get('name')}"
                    last_alert = ALERT_HISTORY.get(alert_key)
                    if not last_alert or (now - last_alert).total_seconds() > cooldown_seconds:
                        breached_hospitals.append(h.get("name", "Unknown"))
                        ALERT_HISTORY[alert_key] = now

            if breached_hospitals:
                result = recommend_transfers(hospitals)
                msg = "🚨 *CRITICAL SURGE ALERT: 95% THRESHOLD BREACHED*\n"
                msg += f"Facilities at >=95% capacity: {', '.join(breached_hospitals)}\n"
                msg += "Autonomous network redistribution recommended to prevent critical overflow.\n\n"
                msg += format_transfer_message(result.get("recommended_transfers", []))
                await send_telegram_message(msg)

            # 2. Standard Capacity Alerts
            alerts = generate_capacity_alerts(hospitals)
            new_alerts = []
            for a in alerts:
                alert_key = f"{a.get('hospital')}_{a.get('type')}_{a.get('level')}"
                last_alert = ALERT_HISTORY.get(alert_key)
                if not last_alert or (now - last_alert).total_seconds() > cooldown_seconds:
                    new_alerts.append(a)
                    ALERT_HISTORY[alert_key] = now

            if new_alerts:
                total_beds = sum(h.get("total_beds", 0) for h in hospitals)
                total_icu = sum(h.get("icu_beds", 0) for h in hospitals)
                total_vents = sum(h.get("ventilators", 0) for h in hospitals)

                summary = {
                    "total_hospitals": len(hospitals),
                    "bed_occupancy": round(sum(h.get("occupied_beds", 0) for h in hospitals) / max(total_beds, 1) * 100.0, 1),
                    "icu_occupancy": round(sum(h.get("occupied_icu", 0) for h in hospitals) / max(total_icu, 1) * 100.0, 1),
                    "ventilator_usage": round(sum(h.get("ventilators_in_use", 0) for h in hospitals) / max(total_vents, 1) * 100.0, 1),
                }
                msg = format_alert_message(new_alerts, summary)
                await send_telegram_message(msg)

        except asyncio.CancelledError:
            logger.info("Autonomous monitoring task cancelled.")
            break
        except Exception as exc:
            logger.error(f"Autonomous monitoring iteration error: {exc}")

        await asyncio.sleep(60)
