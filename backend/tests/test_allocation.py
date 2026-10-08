"""
Tests for Allocation Strategies
Validates invariants across FCFS, Severity, Equity, and Greedy Acuity-Cost heuristics.
"""

import pytest
from allocation_strategies import (
    STRATEGIES,
    allocate_fcfs,
    allocate_severity,
    allocate_equity,
    allocate_optimized,
)


@pytest.fixture
def sample_patient_cohort():
    patients = []
    # 30 patients with diverse acuity, ages, and intervention needs
    for i in range(30):
        patients.append({
            "age": 10 + (i * 3) % 80,
            "severity": 1 + (i % 10),
            "needs_icu": (i % 3 == 0) or (i % 10 >= 8),
            "needs_ventilator": (i % 5 == 0) and (i % 10 >= 7),
            "crisis_type": "pandemic",
        })
    return patients


@pytest.fixture
def constrained_resources():
    return {
        "beds": 12,
        "icu": 4,
        "ventilators": 2,
    }


def test_allocation_strategies_dictionary_populated():
    assert set(STRATEGIES.keys()) == {"fcfs", "severity", "equity", "optimized"}
    for key, spec in STRATEGIES.items():
        assert "name" in spec
        assert "fn" in spec
        assert callable(spec["fn"])


def test_patient_accounting_invariant_across_all_strategies(sample_patient_cohort, constrained_resources):
    """Every patient must be either treated or denied: treated + denied == total."""
    for key, spec in STRATEGIES.items():
        fn = spec["fn"]
        result = fn(sample_patient_cohort, constrained_resources.copy())

        total = len(sample_patient_cohort)
        assert result["treated"] + result["denied"] == total, f"Invariant violated in strategy {key}"
        assert result["treated"] <= total
        assert result["denied"] >= 0
        assert 0.0 <= result["resource_utilization"] <= 100.0


def test_severity_prioritizes_high_acuity(sample_patient_cohort, constrained_resources):
    res_severity = allocate_severity(sample_patient_cohort, constrained_resources.copy())
    res_fcfs = allocate_fcfs(sample_patient_cohort, constrained_resources.copy())

    # Severity-based allocation should preserve more critical patients or have lower estimated mortality
    assert res_severity["critical_saved"] >= 0
    assert res_severity["mortality_estimate"] <= res_fcfs["mortality_estimate"]


def test_optimized_heuristic_efficiency(sample_patient_cohort, constrained_resources):
    res_opt = allocate_optimized(sample_patient_cohort, constrained_resources.copy())
    assert "optimization_score" in res_opt
    assert res_opt["optimization_score"] > 0
    assert res_opt["treated"] > 0
