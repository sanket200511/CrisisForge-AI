"""
CrisisForge AI — Inter-Hospital Transfer Engine
Recommends optimal patient transfers between hospitals in a network
to balance load and maximize survival rates.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional


def calculate_hospital_pressure(hospital: Dict) -> float:
    """Calculate a composite pressure score for a hospital (0-100)."""
    bed_pressure = hospital["occupied_beds"] / max(hospital["total_beds"], 1) * 100
    icu_pressure = hospital["occupied_icu"] / max(hospital["icu_beds"], 1) * 100
    vent_pressure = hospital["ventilators_in_use"] / max(hospital["ventilators"], 1) * 100
    staff_pressure = hospital["active_staff"] / max(hospital["total_staff"], 1) * 100

    # Weighted: ICU and ventilator pressure are more critical
    pressure = (
        bed_pressure * 0.25 +
        icu_pressure * 0.35 +
        vent_pressure * 0.25 +
        staff_pressure * 0.15
    )
    return round(min(pressure, 100), 1)


def calculate_available_capacity(hospital: Dict) -> Dict:
    """Calculate available resources at a hospital."""
    return {
        "beds": max(0, hospital["total_beds"] - hospital["occupied_beds"]),
        "icu": max(0, hospital["icu_beds"] - hospital["occupied_icu"]),
        "ventilators": max(0, hospital["ventilators"] - hospital["ventilators_in_use"]),
        "staff_slack": max(0, hospital["total_staff"] - hospital["active_staff"]),
    }


def generate_distance_matrix(hospitals: List[Dict]) -> Dict[str, Dict[str, float]]:
    """Generate synthetic distances between hospitals (km) based on regions."""
    np.random.seed(42)
    n = len(hospitals)
    distances = {}

    for i, h1 in enumerate(hospitals):
        distances[h1["name"]] = {}
        for j, h2 in enumerate(hospitals):
            if i == j:
                distances[h1["name"]][h2["name"]] = 0.0
            elif h1["region"] == h2["region"]:
                distances[h1["name"]][h2["name"]] = round(np.random.uniform(5, 25), 1)
            else:
                distances[h1["name"]][h2["name"]] = round(np.random.uniform(30, 80), 1)

    return distances


def recommend_transfers(
    hospitals: List[Dict],
    max_transfers: int = 10,
    pressure_threshold: float = 75.0,
    min_receiving_capacity: int = 5,
) -> Dict:
    """
    Recommend patient transfers between hospitals to balance network load.

    Algorithm:
    1. Calculate pressure score for each hospital
    2. Identify overloaded (sender) and underloaded (receiver) hospitals
    3. For each overloaded hospital, find the best receiver based on
       distance, available capacity, and staff readiness
    4. Generate transfer recommendations with priority and estimated impact
    """
    # Step 1: Calculate pressure and capacity for all hospitals
    hospital_metrics = []
    for h in hospitals:
        pressure = calculate_hospital_pressure(h)
        capacity = calculate_available_capacity(h)
        hospital_metrics.append({
            **h,
            "pressure": pressure,
            "available": capacity,
            "status": "critical" if pressure > 90 else "overloaded" if pressure > pressure_threshold else "stable" if pressure > 50 else "available",
        })

    # Step 2: Identify senders and receivers
    senders = [h for h in hospital_metrics if h["pressure"] > pressure_threshold]
    receivers = [h for h in hospital_metrics if h["available"]["beds"] >= min_receiving_capacity and h["pressure"] < pressure_threshold]

    # Sort senders by pressure (most critical first)
    senders.sort(key=lambda x: x["pressure"], reverse=True)
    # Sort receivers by available capacity (most capacity first)
    receivers.sort(key=lambda x: x["available"]["beds"], reverse=True)

    distances = generate_distance_matrix(hospitals)

    # Step 3: Generate transfer recommendations
    transfers = []
    transfer_count = 0

    for sender in senders:
        if transfer_count >= max_transfers:
            break

        excess_beds = sender["occupied_beds"] - int(sender["total_beds"] * 0.75)
        excess_icu = sender["occupied_icu"] - int(sender["icu_beds"] * 0.75)

        if excess_beds <= 0 and excess_icu <= 0:
            continue

        # Score each receiver for this sender
        receiver_scores = []
        for receiver in receivers:
            if receiver["name"] == sender["name"]:
                continue

            dist = distances.get(sender["name"], {}).get(receiver["name"], 50.0)
            capacity_score = (
                receiver["available"]["beds"] * 2 +
                receiver["available"]["icu"] * 5 +
                receiver["available"]["staff_slack"] * 1
            )
            distance_penalty = dist * 0.5
            score = capacity_score - distance_penalty

            receiver_scores.append({
                "receiver": receiver,
                "distance": dist,
                "score": round(score, 1),
            })

        receiver_scores.sort(key=lambda x: x["score"], reverse=True)

        for scored in receiver_scores[:3]:  # Top 3 receivers per sender
            if transfer_count >= max_transfers:
                break

            receiver = scored["receiver"]
            # Calculate how many patients to transfer
            transferable_beds = min(excess_beds, receiver["available"]["beds"], 15)
            transferable_icu = min(max(0, excess_icu), receiver["available"]["icu"], 5)

            if transferable_beds <= 0 and transferable_icu <= 0:
                continue

            # Estimate impact
            sender_new_pressure = calculate_hospital_pressure({
                **sender,
                "occupied_beds": sender["occupied_beds"] - transferable_beds,
                "occupied_icu": sender["occupied_icu"] - transferable_icu,
            })

            transfers.append({
                "id": transfer_count + 1,
                "priority": "critical" if sender["pressure"] > 90 else "high" if sender["pressure"] > 80 else "medium",
                "from_hospital": sender["name"],
                "from_region": sender["region"],
                "from_pressure": sender["pressure"],
                "to_hospital": receiver["name"],
                "to_region": receiver["region"],
                "to_pressure": receiver["pressure"],
                "distance_km": scored["distance"],
                "patients_general": max(0, transferable_beds),
                "patients_icu": max(0, transferable_icu),
                "total_patients": max(0, transferable_beds) + max(0, transferable_icu),
                "estimated_transfer_time_min": round(scored["distance"] * 1.5 + 15, 0),
                "sender_pressure_after": sender_new_pressure,
                "pressure_reduction": round(sender["pressure"] - sender_new_pressure, 1),
                "match_score": scored["score"],
            })

            # Update receiver capacity
            receiver["available"]["beds"] -= max(0, transferable_beds)
            receiver["available"]["icu"] -= max(0, transferable_icu)
            transfer_count += 1

    # Step 4: Build network summary
    total_pressure = np.mean([h["pressure"] for h in hospital_metrics])
    critical_count = sum(1 for h in hospital_metrics if h["pressure"] > 90)
    overloaded_count = sum(1 for h in hospital_metrics if 75 < h["pressure"] <= 90)

    # Estimate post-transfer network pressure
    post_pressure = total_pressure
    if transfers:
        total_reduction = sum(t["pressure_reduction"] for t in transfers)
        post_pressure = max(0, total_pressure - total_reduction / len(hospital_metrics))

    return {
        "network_summary": {
            "total_hospitals": len(hospitals),
            "critical_hospitals": critical_count,
            "overloaded_hospitals": overloaded_count,
            "stable_hospitals": len(hospitals) - critical_count - overloaded_count,
            "avg_network_pressure": round(total_pressure, 1),
            "post_transfer_pressure": round(post_pressure, 1),
            "pressure_improvement": round(total_pressure - post_pressure, 1),
        },
        "hospital_status": [
            {
                "name": h["name"],
                "region": h["region"],
                "pressure": h["pressure"],
                "status": h["status"],
                "available_beds": h["available"]["beds"],
                "available_icu": h["available"]["icu"],
            }
            for h in hospital_metrics
        ],
        "recommended_transfers": transfers,
        "total_patients_to_transfer": sum(t["total_patients"] for t in transfers),
    }
