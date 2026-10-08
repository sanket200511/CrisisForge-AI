"""
Tests for Inter-Hospital Transfer Engine
Validates composite pressure scoring, transfer recommendation rules, and capacity updates.
"""

import pytest
from transfer_engine import (
    calculate_hospital_pressure,
    calculate_available_capacity,
    recommend_transfers,
    generate_distance_matrix,
)


def test_calculate_hospital_pressure_bounds():
    empty_hospital = {
        "occupied_beds": 0, "total_beds": 200,
        "occupied_icu": 0, "icu_beds": 30,
        "ventilators_in_use": 0, "ventilators": 20,
        "active_staff": 0, "total_staff": 150,
    }
    assert calculate_hospital_pressure(empty_hospital) == 0.0

    full_hospital = {
        "occupied_beds": 200, "total_beds": 200,
        "occupied_icu": 30, "icu_beds": 30,
        "ventilators_in_use": 20, "ventilators": 20,
        "active_staff": 150, "total_staff": 150,
    }
    assert calculate_hospital_pressure(full_hospital) == 100.0


def test_calculate_available_capacity_non_negative():
    hospital = {
        "occupied_beds": 180, "total_beds": 200,
        "occupied_icu": 25, "icu_beds": 30,
        "ventilators_in_use": 15, "ventilators": 20,
        "active_staff": 100, "total_staff": 120,
    }
    avail = calculate_available_capacity(hospital)
    assert avail["beds"] == 20
    assert avail["icu"] == 5
    assert avail["ventilators"] == 5
    assert avail["staff_slack"] == 20


def test_recommend_transfers_empty_network():
    result = recommend_transfers([])
    assert result["network_summary"]["total_hospitals"] == 0
    assert result["recommended_transfers"] == []


def test_recommend_transfers_load_balancing():
    hospitals = [
        # Heavily strained hospital (sender candidate)
        {
            "id": 1,
            "name": "Overloaded Hospital A",
            "region": "Central",
            "lat": 21.145, "lng": 79.088,
            "total_beds": 100, "occupied_beds": 95,
            "icu_beds": 20, "occupied_icu": 19,
            "ventilators": 15, "ventilators_in_use": 14,
            "total_staff": 80, "active_staff": 78,
        },
        # Available hospital with capacity (receiver candidate)
        {
            "id": 2,
            "name": "Available Hospital B",
            "region": "Central",
            "lat": 21.148, "lng": 79.090,
            "total_beds": 150, "occupied_beds": 40,
            "icu_beds": 30, "occupied_icu": 5,
            "ventilators": 25, "ventilators_in_use": 4,
            "total_staff": 100, "active_staff": 50,
        },
    ]

    result = recommend_transfers(hospitals)
    transfers = result["recommended_transfers"]

    assert len(transfers) > 0
    for t in transfers:
        # Transfer cannot be from a hospital to itself
        assert t["from_hospital"] != t["to_hospital"]
        assert t["total_patients"] > 0
        assert t["distance_km"] > 0
        assert t["pressure_reduction"] >= 0
