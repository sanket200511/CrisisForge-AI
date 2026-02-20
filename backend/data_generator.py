"""
CrisisForge AI — Synthetic Data Generator
Generates demo hospitals, historical data, and scenarios for showcasing.
"""

import numpy as np
from typing import List, Dict


HOSPITAL_NAMES = [
    "AIIMS Nagpur",
    "Kingsway Hospitals",
    "Wockhardt Hospital",
    "Ojas Hospital",
    "Orange City Hospital",
    "Aureus Hospital",
    "Alexis Multispeciality Hospital",
    "Care Hospial",
]

# Real GPS coordinates for Nagpur hospitals
HOSPITAL_COORDS = [
    (21.1280, 79.0505),   # AIIMS Nagpur (Mihan)
    (21.1560, 79.0740),   # Kingsway Hospitals (Nagpur Central)
    (21.1394, 79.0812),   # Wockhardt Hospital (Sadar)
    (21.1640, 79.0870),   # Ojas Hospital (Dharampeth)
    (21.1490, 79.0950),   # Orange City Hospital (Ambazari)
    (21.1350, 79.1100),   # Aureus Hospital (Wardhaman Nagar)
    (21.1720, 79.0480),   # Alexis Hospital (Manish Nagar)
    (21.1200, 79.0650),   # Care Hospital (South Nagpur)
]

REGIONS = ["Mihan", "Sitabuldi", "Dharampeth", "Sadar", "Wardhaman Nagar"]


def generate_hospitals(count: int = 6) -> List[Dict]:
    """Generate realistic hospital profiles."""
    hospitals = []
    for i in range(min(count, len(HOSPITAL_NAMES))):
        total_beds = int(np.random.uniform(100, 500))
        icu_beds = int(total_beds * np.random.uniform(0.08, 0.18))
        ventilators = int(icu_beds * np.random.uniform(0.5, 0.9))
        staff = int(total_beds * np.random.uniform(0.6, 1.2))

        occupancy = np.random.uniform(0.4, 0.8)

        hospitals.append({
            "id": i + 1,
            "name": HOSPITAL_NAMES[i],
            "region": REGIONS[i % len(REGIONS)],
            "lat": HOSPITAL_COORDS[i][0],
            "lng": HOSPITAL_COORDS[i][1],
            "total_beds": total_beds,
            "icu_beds": icu_beds,
            "ventilators": ventilators,
            "total_staff": staff,
            "occupied_beds": int(total_beds * occupancy),
            "occupied_icu": int(icu_beds * occupancy * 0.9),
            "ventilators_in_use": int(ventilators * occupancy * 0.7),
            "active_staff": int(staff * np.random.uniform(0.7, 0.95)),
        })
    return hospitals


def generate_historical_data(days: int = 90) -> Dict:
    """Generate historical admissions data for trend charts."""
    t = np.arange(days)
    base = 35 + 0.1 * t
    weekly = 5 * np.sin(2 * np.pi * t / 7)
    noise = np.random.normal(0, 3, days)
    admissions = np.maximum(base + weekly + noise, 5).astype(int)

    discharges = np.maximum(admissions - np.random.randint(0, 8, days), 0)
    icu_admissions = (admissions * np.random.uniform(0.08, 0.15, days)).astype(int)

    return {
        "days": list(range(1, days + 1)),
        "admissions": admissions.tolist(),
        "discharges": discharges.tolist(),
        "icu_admissions": icu_admissions.tolist(),
        "avg_daily": round(float(np.mean(admissions)), 1),
        "peak_daily": int(np.max(admissions)),
        "total": int(np.sum(admissions)),
    }


def generate_preset_scenarios() -> List[Dict]:
    """Return preset crisis scenarios for the scenario builder."""
    return [
        {
            "id": 1,
            "name": "COVID-19 Wave",
            "crisis_type": "pandemic",
            "duration_days": 60,
            "surge_multiplier": 2.5,
            "description": "Simulate a pandemic wave with exponential growth, plateau, and gradual decline in patient inflow.",
            "icon": "🦠",
            "severity": "Critical",
        },
        {
            "id": 2,
            "name": "Earthquake Response",
            "crisis_type": "earthquake",
            "duration_days": 30,
            "surge_multiplier": 3.0,
            "description": "Model mass casualty event with sharp initial spike in trauma patients followed by rapid decay.",
            "icon": "🏚️",
            "severity": "Severe",
        },
        {
            "id": 3,
            "name": "Monsoon Flooding",
            "crisis_type": "flood",
            "duration_days": 45,
            "surge_multiplier": 2.0,
            "description": "Gradual rise in waterborne disease and injury cases with sustained peak during flood season.",
            "icon": "🌊",
            "severity": "High",
        },
        {
            "id": 4,
            "name": "Staff Shortage Crisis",
            "crisis_type": "staff_shortage",
            "duration_days": 30,
            "surge_multiplier": 1.0,
            "description": "Model reduced staff availability (40% reduction) during normal patient load.",
            "icon": "👨‍⚕️",
            "severity": "Moderate",
        },
        {
            "id": 5,
            "name": "Multi-Hazard Scenario",
            "crisis_type": "pandemic",
            "duration_days": 90,
            "surge_multiplier": 3.5,
            "description": "Worst-case scenario: pandemic surge combined with infrastructure strain over 3 months.",
            "icon": "⚠️",
            "severity": "Catastrophic",
        },
    ]
