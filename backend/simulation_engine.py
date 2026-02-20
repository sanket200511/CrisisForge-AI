"""
CrisisForge AI — Simulation Engine
Runs discrete-event simulation for crisis scenarios and compares strategies.
"""

import numpy as np
from typing import Dict, List, Optional
from prediction_engine import predict_patient_inflow, predict_resource_consumption
from allocation_strategies import STRATEGIES


def generate_patients_for_day(count: int, crisis_type: str = "pandemic") -> List[Dict]:
    """Generate synthetic patient records for a single day."""
    patients = []
    for _ in range(int(count)):
        severity = int(np.clip(np.random.exponential(4) + 1, 1, 10))

        if crisis_type == "pandemic":
            severity = int(np.clip(severity + np.random.choice([0, 1, 2, 3], p=[0.4, 0.3, 0.2, 0.1]), 1, 10))
        elif crisis_type == "earthquake":
            severity = int(np.clip(severity + np.random.choice([0, 2, 3, 4], p=[0.3, 0.3, 0.25, 0.15]), 1, 10))

        age = int(np.clip(np.random.normal(50, 20), 1, 95))
        needs_icu = severity >= 7 or (severity >= 5 and np.random.random() < 0.3)
        needs_ventilator = severity >= 8 or (needs_icu and np.random.random() < 0.4)

        patients.append({
            "age": age,
            "severity": severity,
            "needs_icu": needs_icu,
            "needs_ventilator": needs_ventilator,
            "crisis_type": crisis_type,
        })
    return patients


def run_simulation(
    crisis_type: str = "pandemic",
    duration_days: int = 30,
    surge_multiplier: float = 2.0,
    base_daily_patients: float = 40.0,
    hospital_beds: int = 200,
    hospital_icu: int = 30,
    hospital_ventilators: int = 20,
    strategies: Optional[List[str]] = None,
) -> Dict:
    """Run full simulation comparing multiple allocation strategies."""

    if strategies is None:
        strategies = list(STRATEGIES.keys())

    # 1. Predict patient inflow
    inflow_forecast = predict_patient_inflow(
        days=duration_days,
        base_daily=base_daily_patients,
        crisis_type=crisis_type,
        surge_multiplier=surge_multiplier,
    )

    # 2. Predict resource consumption
    resource_forecast = predict_resource_consumption(inflow_forecast["mean"])

    # 3. Run each strategy day-by-day
    strategy_results = {}
    for strat_key in strategies:
        if strat_key not in STRATEGIES:
            continue

        strat = STRATEGIES[strat_key]
        timeline = []
        cumulative_treated = 0
        cumulative_denied = 0
        cumulative_deaths_est = 0.0

        # Daily resource pool resets (simplified model)
        for day_idx, daily_inflow in enumerate(inflow_forecast["mean"]):
            patients = generate_patients_for_day(daily_inflow, crisis_type)

            # Available resources for this day (capacity minus some ongoing usage factor)
            usage_factor = min(0.7, day_idx * 0.02)  # gradually more constrained
            daily_resources = {
                "beds": max(1, int(hospital_beds * (1 - usage_factor * 0.3))),
                "icu": max(1, int(hospital_icu * (1 - usage_factor * 0.5))),
                "ventilators": max(1, int(hospital_ventilators * (1 - usage_factor * 0.4))),
            }

            result = strat["fn"](patients, daily_resources)

            cumulative_treated += result["treated"]
            cumulative_denied += result["denied"]
            cumulative_deaths_est += result["mortality_estimate"]

            timeline.append({
                "day": day_idx + 1,
                "patients": len(patients),
                "treated": result["treated"],
                "denied": result["denied"],
                "cumulative_treated": cumulative_treated,
                "cumulative_denied": cumulative_denied,
                "mortality_estimate": round(cumulative_deaths_est, 1),
                "resource_utilization": result["resource_utilization"],
                "avg_wait": result.get("avg_wait", 0),
                "beds_available": daily_resources["beds"],
                "icu_available": daily_resources["icu"],
                "vents_available": daily_resources["ventilators"],
            })

        # Aggregate summary
        total_patients = sum(t["patients"] for t in timeline)
        strategy_results[strat_key] = {
            "name": strat["name"],
            "color": strat["color"],
            "timeline": timeline,
            "summary": {
                "total_patients": total_patients,
                "total_treated": cumulative_treated,
                "total_denied": cumulative_denied,
                "estimated_deaths": round(cumulative_deaths_est, 1),
                "survival_rate": round((1 - cumulative_deaths_est / max(total_patients, 1)) * 100, 1),
                "avg_utilization": round(
                    np.mean([t["resource_utilization"] for t in timeline]), 1
                ),
                "avg_wait_time": round(np.mean([t["avg_wait"] for t in timeline]), 2),
                "peak_denied": max(t["denied"] for t in timeline),
            },
        }

    return {
        "scenario": {
            "crisis_type": crisis_type,
            "duration_days": duration_days,
            "surge_multiplier": surge_multiplier,
            "base_daily_patients": base_daily_patients,
        },
        "hospital": {
            "beds": hospital_beds,
            "icu": hospital_icu,
            "ventilators": hospital_ventilators,
        },
        "inflow_forecast": inflow_forecast,
        "resource_forecast": resource_forecast,
        "strategies": strategy_results,
    }
