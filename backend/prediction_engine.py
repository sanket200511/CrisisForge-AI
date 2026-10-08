"""
CrisisForge AI — Prediction Engine
Time-series patient inflow modeling using baseline trend-seasonality decomposition,
crisis surge response dynamics, and Monte Carlo confidence intervals.
"""

import numpy as np
from typing import Dict, List, Optional


def generate_base_inflow(days: int, base_daily: float = 40.0, seasonality: bool = True) -> np.ndarray:
    """Generate realistic base patient inflow with deterministic trend and weekly harmonic seasonality."""
    t = np.arange(days, dtype=float)
    trend = base_daily + 0.05 * t  # slight upward secular trend
    noise = np.random.normal(0, base_daily * 0.1, days)

    if seasonality:
        weekly = 5.0 * np.sin(2 * np.pi * t / 7.0)  # 7-day cyclical pattern
        return np.maximum(trend + weekly + noise, 1.0)
    return np.maximum(trend + noise, 1.0)


def apply_crisis_surge(
    base: np.ndarray,
    crisis_type: str,
    surge_multiplier: float = 2.0,
    onset_day: int = 5,
) -> np.ndarray:
    """Apply crisis-specific surge patterns to base inflow."""
    days = len(base)
    surged = base.copy()

    if crisis_type == "pandemic":
        # Exponential rise → plateau → gradual decline
        for i in range(days):
            if i < onset_day:
                surged[i] = base[i]
            else:
                phase = (i - onset_day) / max(days - onset_day, 1)
                if phase < 0.4:
                    factor = 1.0 + (surge_multiplier - 1.0) * (phase / 0.4)
                elif phase < 0.7:
                    factor = surge_multiplier
                else:
                    factor = surge_multiplier * (1.0 - 0.6 * ((phase - 0.7) / 0.3))
                surged[i] = base[i] * max(factor, 1.0)

    elif crisis_type == "earthquake":
        # Sharp trauma spike followed by exponential/linear attenuation
        for i in range(days):
            if onset_day <= i < onset_day + 3:
                surged[i] = base[i] * surge_multiplier * 1.5
            elif onset_day + 3 <= i < onset_day + 10:
                decay = 1.5 * (1.0 - (i - onset_day - 3) / 7.0)
                surged[i] = base[i] * surge_multiplier * max(decay, 0.3)
            elif i >= onset_day + 10:
                surged[i] = base[i] * 1.2

    elif crisis_type == "flood":
        # Gradual onset waterborne disease curve, sustained crest, slow recede
        for i in range(days):
            if i < onset_day:
                surged[i] = base[i]
            else:
                phase = (i - onset_day) / max(days - onset_day, 1)
                if phase < 0.3:
                    factor = 1.0 + (surge_multiplier - 1.0) * (phase / 0.3)
                elif phase < 0.6:
                    factor = surge_multiplier * 0.9
                else:
                    factor = surge_multiplier * 0.9 * (1.0 - 0.5 * ((phase - 0.6) / 0.4))
                surged[i] = base[i] * max(factor, 1.0)

    elif crisis_type == "staff_shortage":
        # Inflow remains near baseline; crisis manifests on operational throughput
        surged = base * 1.05

    else:
        surged = base * surge_multiplier

    return np.maximum(surged, 1.0)


def monte_carlo_forecast(
    base_prediction: np.ndarray,
    n_simulations: int = 200,
    volatility: float = 0.15,
) -> Dict[str, List[float]]:
    """Run Monte Carlo simulations around the central trajectory for confidence percentiles."""
    days = len(base_prediction)
    simulations = np.zeros((n_simulations, days))

    for i in range(n_simulations):
        noise = np.random.normal(0, base_prediction * volatility)
        simulations[i] = np.maximum(base_prediction + noise, 0.0)

    return {
        "mean": [round(float(x), 1) for x in base_prediction],
        "p10": [round(float(x), 1) for x in np.percentile(simulations, 10, axis=0)],
        "p25": [round(float(x), 1) for x in np.percentile(simulations, 25, axis=0)],
        "p75": [round(float(x), 1) for x in np.percentile(simulations, 75, axis=0)],
        "p90": [round(float(x), 1) for x in np.percentile(simulations, 90, axis=0)],
    }


def predict_patient_inflow(
    days: int = 30,
    base_daily: float = 40.0,
    crisis_type: Optional[str] = None,
    surge_multiplier: float = 2.0,
    onset_day: int = 5,
) -> Dict:
    """Full prediction pipeline: baseline trend + seasonal harmonics → crisis surge dynamics → Monte Carlo percentiles."""
    base = generate_base_inflow(days, base_daily)

    if crisis_type and crisis_type.lower() not in ("none", "normal"):
        predicted = apply_crisis_surge(base, crisis_type.lower(), surge_multiplier, onset_day)
    else:
        predicted = base

    forecast = monte_carlo_forecast(predicted)
    forecast["base_no_crisis"] = [round(float(x), 1) for x in base]
    forecast["days"] = list(range(1, days + 1))

    return forecast


def predict_resource_consumption(
    patient_inflow: List[float],
    bed_usage_rate: float = 0.85,
    icu_rate: float = 0.15,
    ventilator_rate: float = 0.08,
    avg_stay_days: float = 5.0,
    staff_per_patient: float = 0.5,
) -> Dict[str, List[float]]:
    """Forecast concurrent resource requirements based on patient inflow and length-of-stay queues."""
    days = len(patient_inflow)
    beds_needed = []
    icu_needed = []
    ventilators_needed = []
    staff_needed = []

    active_patients = 0.0
    discharge_queue: List[tuple] = []

    for day in range(days):
        new_patients = patient_inflow[day]
        active_patients += new_patients
        discharge_queue.append((day + avg_stay_days, new_patients))

        # Discharge patients whose length of stay has completed
        while discharge_queue and discharge_queue[0][0] <= day:
            _, discharged = discharge_queue.pop(0)
            active_patients = max(0.0, active_patients - discharged)

        beds_needed.append(active_patients * bed_usage_rate)
        icu_needed.append(active_patients * icu_rate)
        ventilators_needed.append(active_patients * ventilator_rate)
        staff_needed.append(active_patients * staff_per_patient)

    return {
        "days": list(range(1, days + 1)),
        "beds_needed": [round(float(x), 1) for x in beds_needed],
        "icu_needed": [round(float(x), 1) for x in icu_needed],
        "ventilators_needed": [round(float(x), 1) for x in ventilators_needed],
        "staff_needed": [round(float(x), 1) for x in staff_needed],
    }
