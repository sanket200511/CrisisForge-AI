"""
CrisisForge AI — Inter-Hospital Transfer Engine
Recommends patient load redistribution between regional hospitals based on
composite strain scoring, available buffer capacity, and geographic proximity.
"""

from typing import List, Dict, Optional
import numpy as np


def calculate_hospital_pressure(hospital: Dict) -> float:
    """
    Calculate composite pressure score (0-100) across beds, ICU, ventilators, and staff.
    Weights prioritize high-acuity assets (ICU 35%, Vent 25%, Bed 25%, Staff 15%).
    """
    bed_pressure = (hospital.get("occupied_beds", 0) / max(hospital.get("total_beds", 1), 1)) * 100.0
    icu_pressure = (hospital.get("occupied_icu", 0) / max(hospital.get("icu_beds", 1), 1)) * 100.0
    vent_pressure = (hospital.get("ventilators_in_use", 0) / max(hospital.get("ventilators", 1), 1)) * 100.0
    staff_pressure = (hospital.get("active_staff", 0) / max(hospital.get("total_staff", 1), 1)) * 100.0

    pressure = (
        bed_pressure * 0.25 +
        icu_pressure * 0.35 +
        vent_pressure * 0.25 +
        staff_pressure * 0.15
    )
    return round(float(min(max(pressure, 0.0), 100.0)), 1)


def calculate_available_capacity(hospital: Dict) -> Dict:
    """Calculate absolute available resources and headroom at a facility."""
    return {
        "beds": max(0, int(hospital.get("total_beds", 0) - hospital.get("occupied_beds", 0))),
        "icu": max(0, int(hospital.get("icu_beds", 0) - hospital.get("occupied_icu", 0))),
        "ventilators": max(0, int(hospital.get("ventilators", 0) - hospital.get("ventilators_in_use", 0))),
        "staff_slack": max(0, int(hospital.get("total_staff", 0) - hospital.get("active_staff", 0))),
    }


def generate_distance_matrix(hospitals: List[Dict]) -> Dict[str, Dict[str, float]]:
    """
    Generate distance matrix between facilities (km).
    Uses facility lat/lng Euclidean approx if present, else deterministic regional model.
    """
    distances: Dict[str, Dict[str, float]] = {}

    for i, h1 in enumerate(hospitals):
        name1 = h1.get("name", f"Hospital {i+1}")
        distances[name1] = {}
        for j, h2 in enumerate(hospitals):
            name2 = h2.get("name", f"Hospital {j+1}")
            if i == j:
                distances[name1][name2] = 0.0
            elif "lat" in h1 and "lng" in h1 and "lat" in h2 and "lng" in h2:
                # Approx degree-to-km (1 deg lat ~ 111km, 1 deg lng ~ 104km at 21°N)
                dlat = (h1["lat"] - h2["lat"]) * 111.0
                dlng = (h1["lng"] - h2["lng"]) * 104.0
                dist_km = float(np.sqrt(dlat**2 + dlng**2))
                distances[name1][name2] = round(max(1.5, dist_km), 1)
            else:
                same_region = h1.get("region") == h2.get("region")
                distances[name1][name2] = 12.0 if same_region else 35.0

    return distances


def recommend_transfers(
    hospitals: List[Dict],
    max_transfers: int = 10,
    pressure_threshold: float = 75.0,
    min_receiving_capacity: int = 5,
) -> Dict:
    """
    Recommend patient transfers between hospitals to balance network strain.

    Operational Policy:
    - Senders: Facilities with composite pressure score > pressure_threshold (default 75.0%).
      Excess is computed relative to a 75% target capacity line (maintaining a 25% surge buffer).
    - Receivers: Facilities with pressure < pressure_threshold and at least min_receiving_capacity beds available.
    - Matching: Weighted score rewarding available ICU/bed capacity while penalizing transit distance.
    """
    if not hospitals:
        return {
            "network_summary": {
                "total_hospitals": 0, "critical_hospitals": 0, "overloaded_hospitals": 0,
                "stable_hospitals": 0, "avg_network_pressure": 0.0,
                "post_transfer_pressure": 0.0, "pressure_improvement": 0.0,
            },
            "hospital_status": [],
            "recommended_transfers": [],
            "total_patients_to_transfer": 0,
        }

    # Step 1: Calculate pressure and capacity for all hospitals
    hospital_metrics = []
    for h in hospitals:
        pressure = calculate_hospital_pressure(h)
        capacity = calculate_available_capacity(h)
        hospital_metrics.append({
            **h,
            "pressure": pressure,
            "available": capacity,
            "status": "critical" if pressure > 90.0 else "overloaded" if pressure > pressure_threshold else "stable" if pressure > 50.0 else "available",
        })

    # Step 2: Identify senders and receivers
    senders = [h for h in hospital_metrics if h["pressure"] > pressure_threshold]
    receivers = [h for h in hospital_metrics if h["available"]["beds"] >= min_receiving_capacity and h["pressure"] < pressure_threshold]

    senders.sort(key=lambda x: x["pressure"], reverse=True)
    receivers.sort(key=lambda x: x["available"]["beds"], reverse=True)

    distances = generate_distance_matrix(hospitals)

    # Step 3: Match senders to compatible receivers
    transfers = []
    transfer_count = 0

    for sender in senders:
        if transfer_count >= max_transfers:
            break

        # Headroom target = 75% occupancy
        target_beds = int(sender.get("total_beds", 100) * 0.75)
        target_icu = int(sender.get("icu_beds", 20) * 0.75)
        excess_beds = sender.get("occupied_beds", 0) - target_beds
        excess_icu = sender.get("occupied_icu", 0) - target_icu

        if excess_beds <= 0 and excess_icu <= 0:
            continue

        receiver_scores = []
        for receiver in receivers:
            if receiver.get("name") == sender.get("name"):
                continue

            dist = distances.get(sender.get("name", ""), {}).get(receiver.get("name", ""), 30.0)
            capacity_score = (
                receiver["available"]["beds"] * 2.0 +
                receiver["available"]["icu"] * 5.0 +
                receiver["available"]["staff_slack"] * 1.0
            )
            distance_penalty = dist * 0.5
            score = capacity_score - distance_penalty

            receiver_scores.append({
                "receiver": receiver,
                "distance": dist,
                "score": round(float(score), 1),
            })

        receiver_scores.sort(key=lambda x: x["score"], reverse=True)

        for scored in receiver_scores[:3]:
            if transfer_count >= max_transfers:
                break

            receiver = scored["receiver"]
            transferable_beds = min(excess_beds, receiver["available"]["beds"], 15)
            transferable_icu = min(max(0, excess_icu), receiver["available"]["icu"], 5)

            if transferable_beds <= 0 and transferable_icu <= 0:
                continue

            sender_new_pressure = calculate_hospital_pressure({
                **sender,
                "occupied_beds": sender.get("occupied_beds", 0) - max(0, transferable_beds),
                "occupied_icu": sender.get("occupied_icu", 0) - max(0, transferable_icu),
            })

            transfers.append({
                "id": transfer_count + 1,
                "priority": "critical" if sender["pressure"] > 90.0 else "high" if sender["pressure"] > 80.0 else "medium",
                "from_hospital": sender.get("name", "Unknown"),
                "from_region": sender.get("region", "Central"),
                "from_pressure": sender["pressure"],
                "to_hospital": receiver.get("name", "Unknown"),
                "to_region": receiver.get("region", "Central"),
                "to_pressure": receiver["pressure"],
                "distance_km": scored["distance"],
                "patients_general": max(0, int(transferable_beds)),
                "patients_icu": max(0, int(transferable_icu)),
                "total_patients": max(0, int(transferable_beds)) + max(0, int(transferable_icu)),
                "estimated_transfer_time_min": round(scored["distance"] * 1.5 + 15.0, 0),
                "sender_pressure_after": sender_new_pressure,
                "pressure_reduction": round(float(sender["pressure"] - sender_new_pressure), 1),
                "match_score": scored["score"],
            })

            receiver["available"]["beds"] -= max(0, int(transferable_beds))
            receiver["available"]["icu"] -= max(0, int(transferable_icu))
            transfer_count += 1

    # Step 4: Aggregate network strain metrics
    pressures = [h["pressure"] for h in hospital_metrics]
    total_pressure = float(np.mean(pressures)) if pressures else 0.0
    critical_count = sum(1 for h in hospital_metrics if h["pressure"] > 90.0)
    overloaded_count = sum(1 for h in hospital_metrics if 75.0 < h["pressure"] <= 90.0)

    post_pressure = total_pressure
    if transfers:
        total_reduction = sum(t["pressure_reduction"] for t in transfers)
        post_pressure = max(0.0, total_pressure - total_reduction / len(hospital_metrics))

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
                "name": h.get("name", ""),
                "region": h.get("region", ""),
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
