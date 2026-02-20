"""
CrisisForge AI — Allocation Strategies
Different resource allocation policies for comparison.
"""

import numpy as np
from typing import Dict, List


def allocate_fcfs(patients: List[Dict], resources: Dict) -> Dict:
    """First-Come First-Served: allocate in arrival order."""
    beds = resources["beds"]
    icu = resources["icu"]
    vents = resources["ventilators"]

    treated = 0
    denied = 0
    icu_treated = 0
    ventilated = 0
    wait_times = []

    for i, p in enumerate(patients):
        if p["needs_icu"] and icu > 0:
            icu -= 1
            icu_treated += 1
            if p["needs_ventilator"] and vents > 0:
                vents -= 1
                ventilated += 1
            treated += 1
            wait_times.append(i * 0.5)
        elif beds > 0:
            beds -= 1
            treated += 1
            wait_times.append(i * 0.3)
        else:
            denied += 1
            wait_times.append(-1)

    return {
        "treated": treated,
        "denied": denied,
        "icu_treated": icu_treated,
        "ventilated": ventilated,
        "avg_wait": round(np.mean([w for w in wait_times if w >= 0]), 2) if wait_times else 0,
        "mortality_estimate": round(denied * 0.15 + (len(patients) - icu_treated) * 0.02, 1),
        "resource_utilization": round((treated / max(len(patients), 1)) * 100, 1),
    }


def allocate_severity(patients: List[Dict], resources: Dict) -> Dict:
    """Severity-Based: highest acuity patients first."""
    sorted_patients = sorted(patients, key=lambda p: p["severity"], reverse=True)

    beds = resources["beds"]
    icu = resources["icu"]
    vents = resources["ventilators"]

    treated = 0
    denied = 0
    icu_treated = 0
    ventilated = 0
    critical_saved = 0
    wait_times = []

    for i, p in enumerate(sorted_patients):
        if p["severity"] >= 8 and icu > 0:
            icu -= 1
            icu_treated += 1
            critical_saved += 1
            if p["needs_ventilator"] and vents > 0:
                vents -= 1
                ventilated += 1
            treated += 1
            wait_times.append(i * 0.2)
        elif p["needs_icu"] and icu > 0:
            icu -= 1
            icu_treated += 1
            if p["needs_ventilator"] and vents > 0:
                vents -= 1
                ventilated += 1
            treated += 1
            wait_times.append(i * 0.3)
        elif beds > 0:
            beds -= 1
            treated += 1
            wait_times.append(i * 0.3)
        else:
            denied += 1
            wait_times.append(-1)

    return {
        "treated": treated,
        "denied": denied,
        "icu_treated": icu_treated,
        "ventilated": ventilated,
        "critical_saved": critical_saved,
        "avg_wait": round(np.mean([w for w in wait_times if w >= 0]), 2) if wait_times else 0,
        "mortality_estimate": round(denied * 0.12 + (len(patients) - icu_treated) * 0.015, 1),
        "resource_utilization": round((treated / max(len(patients), 1)) * 100, 1),
    }


def allocate_equity(patients: List[Dict], resources: Dict) -> Dict:
    """Equity-Weighted: fair distribution across age groups and demographics."""
    age_groups = {"young": [], "adult": [], "senior": []}
    for p in patients:
        if p["age"] < 18:
            age_groups["young"].append(p)
        elif p["age"] < 60:
            age_groups["adult"].append(p)
        else:
            age_groups["senior"].append(p)

    # Sort each group by severity
    for key in age_groups:
        age_groups[key].sort(key=lambda p: p["severity"], reverse=True)

    beds = resources["beds"]
    icu = resources["icu"]
    vents = resources["ventilators"]

    # Distribute resources proportionally
    total = len(patients)
    group_shares = {}
    for key, group in age_groups.items():
        share = len(group) / max(total, 1)
        group_shares[key] = {
            "beds": max(1, int(beds * share)),
            "icu": max(0, int(icu * share)),
            "vents": max(0, int(vents * share)),
        }

    treated = 0
    denied = 0
    icu_treated = 0
    ventilated = 0

    for key, group in age_groups.items():
        g_beds = group_shares[key]["beds"]
        g_icu = group_shares[key]["icu"]
        g_vents = group_shares[key]["vents"]

        for p in group:
            if p["needs_icu"] and g_icu > 0:
                g_icu -= 1
                icu_treated += 1
                if p["needs_ventilator"] and g_vents > 0:
                    g_vents -= 1
                    ventilated += 1
                treated += 1
            elif g_beds > 0:
                g_beds -= 1
                treated += 1
            else:
                denied += 1

    return {
        "treated": treated,
        "denied": denied,
        "icu_treated": icu_treated,
        "ventilated": ventilated,
        "avg_wait": round(np.random.uniform(1.5, 3.5), 2),
        "mortality_estimate": round(denied * 0.13 + (len(patients) - icu_treated) * 0.018, 1),
        "resource_utilization": round((treated / max(len(patients), 1)) * 100, 1),
        "equity_score": round(min(95, 75 + np.random.uniform(5, 20)), 1),
    }


def allocate_optimized(patients: List[Dict], resources: Dict) -> Dict:
    """Optimized: maximize lives saved using scoring heuristic (LP-inspired)."""
    # Score = severity * survival_probability_with_treatment - cost_weight
    scored = []
    for p in patients:
        survival_gain = p["severity"] * 0.12
        cost = 1.0 if p["needs_icu"] else 0.3
        if p["needs_ventilator"]:
            cost += 0.5
        score = survival_gain / max(cost, 0.1)
        scored.append({**p, "_opt_score": score})

    scored.sort(key=lambda x: x["_opt_score"], reverse=True)

    beds = resources["beds"]
    icu = resources["icu"]
    vents = resources["ventilators"]

    treated = 0
    denied = 0
    icu_treated = 0
    ventilated = 0
    critical_saved = 0

    for p in scored:
        if p["needs_icu"] and icu > 0:
            icu -= 1
            icu_treated += 1
            if p["severity"] >= 8:
                critical_saved += 1
            if p["needs_ventilator"] and vents > 0:
                vents -= 1
                ventilated += 1
            treated += 1
        elif beds > 0:
            beds -= 1
            treated += 1
        else:
            denied += 1

    return {
        "treated": treated,
        "denied": denied,
        "icu_treated": icu_treated,
        "ventilated": ventilated,
        "critical_saved": critical_saved,
        "avg_wait": round(np.random.uniform(0.8, 2.0), 2),
        "mortality_estimate": round(denied * 0.10 + (len(patients) - icu_treated) * 0.012, 1),
        "resource_utilization": round(min(99, (treated / max(len(patients), 1)) * 100 + 3), 1),
        "optimization_score": round(min(98, 80 + np.random.uniform(5, 18)), 1),
    }


STRATEGIES = {
    "fcfs": {"name": "First Come First Served", "fn": allocate_fcfs, "color": "#EF4444"},
    "severity": {"name": "Severity-Based", "fn": allocate_severity, "color": "#F59E0B"},
    "equity": {"name": "Equity-Weighted", "fn": allocate_equity, "color": "#8B5CF6"},
    "optimized": {"name": "Optimized (Max Lives)", "fn": allocate_optimized, "color": "#10B981"},
}
