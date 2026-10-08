"""
Tests for Prediction Engine
Validates time-series patient inflow and resource consumption models.
"""

import numpy as np
import pytest
from prediction_engine import (
    generate_base_inflow,
    apply_crisis_surge,
    monte_carlo_forecast,
    predict_patient_inflow,
    predict_resource_consumption,
)


def test_generate_base_inflow_shape_and_bounds():
    days = 45
    base = generate_base_inflow(days=days, base_daily=50.0, seasonality=True)
    assert len(base) == days
    assert np.all(base >= 1.0)
    assert isinstance(base, np.ndarray)


def test_apply_crisis_surge_patterns():
    days = 30
    base = np.full(days, 40.0)

    for crisis in ["pandemic", "earthquake", "flood", "staff_shortage", "none"]:
        surged = apply_crisis_surge(base, crisis_type=crisis, surge_multiplier=2.5, onset_day=5)
        assert len(surged) == days
        assert np.all(surged >= 1.0)

    # Earthquake should produce trauma spike within onset_day to onset_day + 3
    eq_surged = apply_crisis_surge(base, crisis_type="earthquake", surge_multiplier=2.0, onset_day=5)
    assert eq_surged[6] > base[6]


def test_monte_carlo_forecast_percentile_monotonicity():
    base = np.linspace(30.0, 60.0, 20)
    forecast = monte_carlo_forecast(base, n_simulations=150, volatility=0.15)

    assert "mean" in forecast
    assert "p10" in forecast
    assert "p25" in forecast
    assert "p75" in forecast
    assert "p90" in forecast

    for i in range(len(base)):
        # Quantiles should preserve mathematical ordering: p10 <= p25 <= p75 <= p90
        assert forecast["p10"][i] <= forecast["p25"][i] <= forecast["p75"][i] <= forecast["p90"][i]


def test_predict_patient_inflow_integration():
    result = predict_patient_inflow(
        days=21, base_daily=40.0, crisis_type="pandemic", surge_multiplier=2.0
    )
    assert len(result["days"]) == 21
    assert len(result["mean"]) == 21
    assert len(result["base_no_crisis"]) == 21


def test_predict_resource_consumption():
    inflow = [50.0] * 14
    consumption = predict_resource_consumption(inflow)

    assert len(consumption["days"]) == 14
    assert len(consumption["beds_needed"]) == 14
    assert len(consumption["icu_needed"]) == 14
    assert len(consumption["ventilators_needed"]) == 14
    assert len(consumption["staff_needed"]) == 14

    assert all(b >= 0.0 for b in consumption["beds_needed"])
    assert all(i >= 0.0 for i in consumption["icu_needed"])
    # ICU rate is less than total bed rate
    assert consumption["icu_needed"][-1] < consumption["beds_needed"][-1]
