/**
 * CrisisForge AI — API Client v2.0
 * Includes transfer engine, ML model, and Telegram integrations
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`);
    return res.json();
}

// ─── Types ───

export interface Hospital {
    id: number;
    name: string;
    region: string;
    total_beds: number;
    icu_beds: number;
    ventilators: number;
    total_staff: number;
    occupied_beds: number;
    occupied_icu: number;
    ventilators_in_use: number;
    active_staff: number;
}

export interface DashboardSummary {
    hospitals_count: number;
    overview: {
        total_beds: number;
        occupied_beds: number;
        bed_occupancy: number;
        total_icu: number;
        occupied_icu: number;
        icu_occupancy: number;
        total_ventilators: number;
        ventilators_in_use: number;
        ventilator_usage: number;
        total_staff: number;
        active_staff: number;
        staff_utilization: number;
    };
    recent_admissions: {
        days: number[];
        admissions: number[];
        discharges: number[];
        icu_admissions: number[];
        avg_daily: number;
        peak_daily: number;
        total: number;
    };
    hospitals: Hospital[];
    alerts: { level: string; hospital: string; message: string; type: string }[];
}

export interface Scenario {
    id: number;
    name: string;
    crisis_type: string;
    duration_days: number;
    surge_multiplier: number;
    description: string;
    icon: string;
    severity: string;
}

export interface StrategyTimeline {
    day: number;
    patients: number;
    treated: number;
    denied: number;
    cumulative_treated: number;
    cumulative_denied: number;
    mortality_estimate: number;
    resource_utilization: number;
    avg_wait: number;
}

export interface StrategySummary {
    total_patients: number;
    total_treated: number;
    total_denied: number;
    estimated_deaths: number;
    survival_rate: number;
    avg_utilization: number;
    avg_wait_time: number;
    peak_denied: number;
}

export interface StrategyResult {
    name: string;
    color: string;
    timeline: StrategyTimeline[];
    summary: StrategySummary;
}

export interface SimulationResult {
    scenario: {
        crisis_type: string;
        duration_days: number;
        surge_multiplier: number;
        base_daily_patients: number;
    };
    hospital: { beds: number; icu: number; ventilators: number };
    inflow_forecast: {
        days: number[];
        mean: number[];
        p10: number[];
        p25: number[];
        p75: number[];
        p90: number[];
        base_no_crisis: number[];
    };
    resource_forecast: {
        days: number[];
        beds_needed: number[];
        icu_needed: number[];
        ventilators_needed: number[];
        staff_needed: number[];
    };
    strategies: Record<string, StrategyResult>;
}

export interface SimulationRequest {
    crisis_type: string;
    duration_days: number;
    surge_multiplier: number;
    base_daily_patients: number;
    hospital_beds: number;
    hospital_icu: number;
    hospital_ventilators: number;
    strategies?: string[];
}

// Transfer types
export interface TransferRecommendation {
    id: number;
    priority: string;
    from_hospital: string;
    from_region: string;
    from_pressure: number;
    to_hospital: string;
    to_region: string;
    to_pressure: number;
    distance_km: number;
    patients_general: number;
    patients_icu: number;
    total_patients: number;
    estimated_transfer_time_min: number;
    sender_pressure_after: number;
    pressure_reduction: number;
    match_score: number;
}

export interface TransferResult {
    network_summary: {
        total_hospitals: number;
        critical_hospitals: number;
        overloaded_hospitals: number;
        stable_hospitals: number;
        avg_network_pressure: number;
        post_transfer_pressure: number;
        pressure_improvement: number;
    };
    hospital_status: {
        name: string;
        region: string;
        pressure: number;
        status: string;
        available_beds: number;
        available_icu: number;
    }[];
    recommended_transfers: TransferRecommendation[];
    total_patients_to_transfer: number;
}

// ML types
export interface PatientInput {
    age: number;
    gender: number;
    severity_score: number;
    respiratory_rate: number;
    heart_rate: number;
    spo2: number;
    temperature: number;
    systolic_bp: number;
    has_comorbidity: number;
    comorbidity_count: number;
    days_since_symptom_onset: number;
    is_icu_candidate: number;
    crisis_day: number;
    hospital_bed_occupancy: number;
    hospital_icu_occupancy: number;
}

export interface MLPrediction {
    predicted_outcome: string;
    outcome_probabilities: Record<string, number>;
    predicted_resource_hours: number;
    risk_level: string;
}

export interface FeatureContribution {
    feature: string;
    value: number;
    contribution: number;
    direction: string;
    magnitude: number;
}

export interface MLExplanation {
    prediction: MLPrediction;
    explanation: {
        method: string;
        contributions: FeatureContribution[];
        top_risk_factors: FeatureContribution[];
        top_protective_factors: FeatureContribution[];
    };
}

export interface FeatureImportance {
    feature_importance: {
        feature: string;
        outcome_importance: number;
        resource_importance: number;
        combined_importance: number;
    }[];
    top_predictors: string[];
    model_type: string;
    model_metrics: Record<string, unknown>;
}

// ─── API Functions ───

export const api = {
    // Core
    getDashboard: () => request<DashboardSummary>('/api/dashboard-summary'),
    getHospitals: (count = 6) => request<{ hospitals: Hospital[] }>(`/api/hospitals?count=${count}`),
    getScenarios: () => request<{ scenarios: Scenario[] }>('/api/scenarios'),
    getStrategies: () => request<{ strategies: { key: string; name: string; color: string }[] }>('/api/strategies'),
    getHistorical: (days = 90) => request<{ data: Record<string, unknown> }>(`/api/historical?days=${days}`),

    predict: (data: { days: number; base_daily: number; crisis_type?: string; surge_multiplier: number }) =>
        request<{ inflow: Record<string, unknown>; resources: Record<string, unknown> }>('/api/predict', {
            method: 'POST', body: JSON.stringify(data),
        }),

    simulate: (data: SimulationRequest) =>
        request<SimulationResult>('/api/simulate', { method: 'POST', body: JSON.stringify(data) }),

    // Transfer engine
    getTransfers: (count = 6) => request<TransferResult>(`/api/transfers?hospital_count=${count}`),

    // ML model
    mlPredict: (data: PatientInput) =>
        request<MLPrediction>('/api/ml/predict', { method: 'POST', body: JSON.stringify(data) }),

    mlExplain: (data: PatientInput) =>
        request<MLExplanation>('/api/ml/explain', { method: 'POST', body: JSON.stringify(data) }),

    mlImportance: () => request<FeatureImportance>('/api/ml/importance'),

    mlStatus: () => request<{ trained: boolean; metrics: Record<string, unknown> }>('/api/ml/status'),

    // Telegram
    telegramStatus: () => request<Record<string, unknown>>('/api/telegram/status'),
    telegramPreview: (type = 'alerts') => request<{ preview: string }>(`/api/telegram/preview?message_type=${type}`),
    telegramSend: (data: { bot_token: string; chat_id: string; message_type: string; custom_message?: string }) =>
        request<{ result: Record<string, unknown>; message_preview: string }>('/api/telegram/send', {
            method: 'POST', body: JSON.stringify(data),
        }),
};
