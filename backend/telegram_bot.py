"""
CrisisForge AI — Telegram Bot for Autonomous Crisis Alerts
Sends real-time capacity alerts and crisis notifications to administrators.

Usage:
  1. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env variables
  2. The bot runs alongside FastAPI and checks capacity periodically
  3. Sends autonomous alerts when thresholds are breached
"""

import os
import asyncio
import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Telegram config
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# Alert thresholds
THRESHOLDS = {
    "bed_critical": 90,
    "bed_warning": 80,
    "icu_critical": 85,
    "icu_warning": 75,
    "ventilator_critical": 85,
    "staff_warning": 90,
}


def format_alert_message(alerts: List[Dict], summary: Dict) -> str:
    """Format alerts into a Telegram-ready message."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M")

    msg = f"🔥 *CrisisForge AI Alert*\n"
    msg += f"📅 {now}\n\n"

    if summary:
        msg += f"📊 *Network Overview*\n"
        msg += f"├ Hospitals: {summary.get('total_hospitals', 'N/A')}\n"
        msg += f"├ Bed Occ: {summary.get('bed_occupancy', 'N/A')}%\n"
        msg += f"├ ICU Occ: {summary.get('icu_occupancy', 'N/A')}%\n"
        msg += f"└ Ventilator: {summary.get('ventilator_usage', 'N/A')}%\n\n"

    if alerts:
        msg += f"⚠️ *Active Alerts ({len(alerts)})*\n"
        for a in alerts:
            icon = "🔴" if a["level"] == "critical" else "🟡"
            msg += f"{icon} *{a['hospital']}*: {a['message']}\n"
    else:
        msg += "✅ All systems within normal thresholds\n"

    msg += f"\n🔗 Dashboard: http://localhost:5173"
    return msg


def format_transfer_message(transfers: List[Dict]) -> str:
    """Format transfer recommendations into Telegram message."""
    if not transfers:
        return "✅ No transfers recommended — network is balanced."

    msg = "🚑 *Patient Transfer Recommendations*\n\n"
    for t in transfers[:5]:
        priority_icon = "🔴" if t["priority"] == "critical" else "🟡" if t["priority"] == "high" else "🟢"
        msg += f"{priority_icon} *Transfer #{t['id']}*\n"
        msg += f"  📤 From: {t['from_hospital']} ({t['from_pressure']}% load)\n"
        msg += f"  📥 To: {t['to_hospital']} ({t['to_pressure']}% load)\n"
        msg += f"  👥 Patients: {t['total_patients']} ({t['patients_general']} general + {t['patients_icu']} ICU)\n"
        msg += f"  📏 Distance: {t['distance_km']}km (~{int(t['estimated_transfer_time_min'])}min)\n"
        msg += f"  📉 Pressure reduction: {t['pressure_reduction']}%\n\n"

    msg += f"Total patients to transfer: {sum(t['total_patients'] for t in transfers)}"
    return msg


def format_prediction_message(prediction: Dict) -> str:
    """Format ML prediction into Telegram message."""
    msg = "🧠 *AI Prediction Result*\n\n"
    msg += f"🎯 Outcome: *{prediction['predicted_outcome']}*\n"
    msg += f"⚠️ Risk Level: *{prediction['risk_level']}*\n"
    msg += f"⏱️ Est. Resource Hours: {prediction['predicted_resource_hours']}\n\n"

    msg += "📊 *Outcome Probabilities:*\n"
    probs = prediction["outcome_probabilities"]
    msg += f"  ✅ Discharged: {probs['discharged']}%\n"
    msg += f"  🏥 Admitted: {probs['admitted']}%\n"
    msg += f"  ⚠️ Critical: {probs['critical']}%\n"
    msg += f"  💀 Deceased: {probs['deceased']}%\n"

    return msg


async def send_telegram_message(message: str, token: str = "", chat_id: str = "") -> Dict:
    """Send a message via Telegram Bot API."""
    token = token or BOT_TOKEN
    chat_id = chat_id or CHAT_ID

    if not token or not chat_id:
        return {
            "success": False,
            "error": "Telegram bot not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.",
            "message_preview": message[:200],
        }

    try:
        import urllib.request
        import json

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        data = json.dumps({
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "Markdown",
        }).encode("utf-8")

        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            return {"success": True, "message_id": result.get("result", {}).get("message_id")}

    except Exception as e:
        logger.error(f"Telegram send failed: {e}")
        return {"success": False, "error": str(e)}


def generate_capacity_alerts(hospitals: List[Dict]) -> List[Dict]:
    """Generate alerts based on current hospital capacity."""
    alerts = []

    for h in hospitals:
        bed_pct = round(h["occupied_beds"] / max(h["total_beds"], 1) * 100, 1)
        icu_pct = round(h["occupied_icu"] / max(h["icu_beds"], 1) * 100, 1)
        vent_pct = round(h["ventilators_in_use"] / max(h["ventilators"], 1) * 100, 1)

        if bed_pct >= THRESHOLDS["bed_critical"]:
            alerts.append({"level": "critical", "hospital": h["name"], "message": f"Bed occupancy at {bed_pct}%", "type": "bed"})
        elif bed_pct >= THRESHOLDS["bed_warning"]:
            alerts.append({"level": "warning", "hospital": h["name"], "message": f"Bed occupancy at {bed_pct}%", "type": "bed"})

        if icu_pct >= THRESHOLDS["icu_critical"]:
            alerts.append({"level": "critical", "hospital": h["name"], "message": f"ICU occupancy at {icu_pct}%", "type": "icu"})
        elif icu_pct >= THRESHOLDS["icu_warning"]:
            alerts.append({"level": "warning", "hospital": h["name"], "message": f"ICU occupancy at {icu_pct}%", "type": "icu"})

        if vent_pct >= THRESHOLDS["ventilator_critical"]:
            alerts.append({"level": "critical", "hospital": h["name"], "message": f"Ventilator usage at {vent_pct}%", "type": "ventilator"})

    return alerts


def get_bot_status() -> Dict:
    """Get the current configuration status of the Telegram bot."""
    return {
        "configured": bool(BOT_TOKEN and CHAT_ID),
        "bot_token_set": bool(BOT_TOKEN),
        "chat_id_set": bool(CHAT_ID),
        "thresholds": THRESHOLDS,
        "instructions": {
            "step_1": "Create a bot via @BotFather on Telegram",
            "step_2": "Set TELEGRAM_BOT_TOKEN environment variable",
            "step_3": "Get your chat ID via @userinfobot",
            "step_4": "Set TELEGRAM_CHAT_ID environment variable",
        },
    }
