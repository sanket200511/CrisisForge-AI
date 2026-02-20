import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, Shield, AlertTriangle, Activity } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../api';
import type { MLPrediction, MLExplanation, FeatureImportance, PatientInput } from '../api';

const DEFAULT_PATIENT: PatientInput = {
    age: 55, gender: 1, severity_score: 6, respiratory_rate: 22,
    heart_rate: 95, spo2: 91, temperature: 38.2, systolic_bp: 135,
    has_comorbidity: 1, comorbidity_count: 2, days_since_symptom_onset: 5,
    is_icu_candidate: 0, crisis_day: 20, hospital_bed_occupancy: 0.78,
    hospital_icu_occupancy: 0.65,
};

const FIELD_LABELS: Record<string, { label: string; min: number; max: number; step: number }> = {
    age: { label: 'Age', min: 1, max: 100, step: 1 },
    severity_score: { label: 'Severity (1-10)', min: 1, max: 10, step: 0.5 },
    respiratory_rate: { label: 'Respiratory Rate', min: 8, max: 45, step: 1 },
    heart_rate: { label: 'Heart Rate', min: 40, max: 180, step: 1 },
    spo2: { label: 'SpO2 (%)', min: 70, max: 100, step: 1 },
    temperature: { label: 'Temperature (°C)', min: 35, max: 41, step: 0.1 },
    systolic_bp: { label: 'Systolic BP', min: 70, max: 200, step: 5 },
    comorbidity_count: { label: 'Comorbidities', min: 0, max: 5, step: 1 },
    days_since_symptom_onset: { label: 'Days Since Onset', min: 0, max: 30, step: 1 },
    hospital_bed_occupancy: { label: 'Bed Occupancy', min: 0, max: 1, step: 0.05 },
    hospital_icu_occupancy: { label: 'ICU Occupancy', min: 0, max: 1, step: 0.05 },
};

export default function AIPredictor() {
    const [patient, setPatient] = useState<PatientInput>({ ...DEFAULT_PATIENT });
    const [prediction, setPrediction] = useState<MLPrediction | null>(null);
    const [explanation, setExplanation] = useState<MLExplanation | null>(null);
    const [importance, setImportance] = useState<FeatureImportance | null>(null);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<'predict' | 'explain' | 'importance'>('predict');

    const runPrediction = async () => {
        setLoading(true);
        try {
            const [pred, expl, imp] = await Promise.all([
                api.mlPredict(patient),
                api.mlExplain(patient),
                api.mlImportance(),
            ]);
            setPrediction(pred);
            setExplanation(expl);
            setImportance(imp);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const updateField = (key: string, value: number) => {
        setPatient(prev => ({ ...prev, [key]: value }));
    };

    const riskColor = (level: string) =>
        level === 'Critical' ? '#ef4444' : level === 'Moderate' ? '#f59e0b' : '#10b981';

    const importanceChartData = importance?.feature_importance.slice(0, 10).map(f => ({
        name: f.feature.replace(/_/g, ' '),
        importance: f.combined_importance,
    })) || [];

    const contributionChartData = explanation?.explanation.contributions.slice(0, 10).map(c => ({
        name: c.feature.replace(/_/g, ' '),
        contribution: c.contribution,
        fill: c.direction === 'increases_risk' ? '#ef4444' : '#10b981',
    })) || [];

    return (
        <div>
            <motion.div className="page-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2>🧠 AI Predictor</h2>
                <p>ML-powered patient outcome prediction with SHAP explainability</p>
            </motion.div>

            {/* Patient Input Form */}
            <div className="charts-grid">
                <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h3 style={{ marginBottom: 16 }}>Patient Parameters</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        {Object.entries(FIELD_LABELS).map(([key, cfg]) => (
                            <div key={key} style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', fontWeight: 600 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{cfg.label}</span>
                                    <span style={{ color: 'var(--accent-cyan)' }}>{(patient as any)[key]}</span>
                                </div>
                                <input
                                    type="range"
                                    className="range-slider"
                                    min={cfg.min} max={cfg.max} step={cfg.step}
                                    value={(patient as any)[key]}
                                    onChange={e => updateField(key, parseFloat(e.target.value))}
                                />
                            </div>
                        ))}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                <span>Gender</span>
                            </div>
                            <div className="tab-group" style={{ width: '100%' }}>
                                <button className={`tab-btn ${patient.gender === 0 ? 'active' : ''}`} onClick={() => updateField('gender', 0)}>Female</button>
                                <button className={`tab-btn ${patient.gender === 1 ? 'active' : ''}`} onClick={() => updateField('gender', 1)}>Male</button>
                            </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                <span>ICU Candidate</span>
                            </div>
                            <div className="tab-group" style={{ width: '100%' }}>
                                <button className={`tab-btn ${patient.is_icu_candidate === 0 ? 'active' : ''}`} onClick={() => updateField('is_icu_candidate', 0)}>No</button>
                                <button className={`tab-btn ${patient.is_icu_candidate === 1 ? 'active' : ''}`} onClick={() => updateField('is_icu_candidate', 1)}>Yes</button>
                            </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ marginBottom: 8, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                <span>Comorbidity</span>
                            </div>
                            <div className="tab-group" style={{ width: '100%' }}>
                                <button className={`tab-btn ${patient.has_comorbidity === 0 ? 'active' : ''}`} onClick={() => updateField('has_comorbidity', 0)}>No</button>
                                <button className={`tab-btn ${patient.has_comorbidity === 1 ? 'active' : ''}`} onClick={() => updateField('has_comorbidity', 1)}>Yes</button>
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={runPrediction} disabled={loading}>
                        {loading ? <><Activity size={16} /> Analyzing...</> : <><Brain size={16} /> Predict Outcome</>}
                    </button>
                </motion.div>

                {/* Prediction Result */}
                <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {!prediction && !loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
                            <div style={{ fontSize: '3rem', opacity: 0.3 }}>🧠</div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Adjust parameters and click "Predict Outcome"</p>
                        </div>
                    )}
                    {loading && (
                        <div className="loading-container" style={{ minHeight: 300 }}>
                            <div className="loading-spinner" />
                            <p className="loading-text">Running ML inference...</p>
                        </div>
                    )}
                    {prediction && !loading && (
                        <>
                            <h3 style={{ marginBottom: 16 }}>Prediction Result</h3>
                            <div style={{ textAlign: 'center', padding: '16px 0', background: 'rgba(6,182,212,0.05)', borderRadius: 12, marginBottom: 16 }}>
                                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: riskColor(prediction.risk_level) }}>
                                    {prediction.predicted_outcome}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: riskColor(prediction.risk_level), marginTop: 4 }}>
                                    {prediction.risk_level === 'Critical' ? '⚠️' : prediction.risk_level === 'Moderate' ? '🟡' : '✅'} {prediction.risk_level} Risk
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                                {Object.entries(prediction.outcome_probabilities).map(([key, val]) => (
                                    <div key={key} style={{ padding: '10px 14px', background: 'rgba(148,163,184,0.05)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'capitalize' }}>{key}</span>
                                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: key === 'deceased' ? '#ef4444' : key === 'critical' ? '#f59e0b' : '#f1f5f9' }}>{val}%</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '12px 16px', background: 'rgba(6,182,212,0.08)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Est. Resource Hours</span>
                                <span style={{ fontWeight: 700, color: '#06b6d4', fontSize: '1.1rem' }}>{prediction.predicted_resource_hours}h</span>
                            </div>

                            {importance && (
                                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(148,163,184,0.05)', borderRadius: 8 }}>
                                    <p style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                        Model: {importance.model_type} • Accuracy: {(importance.model_metrics as any)?.outcome_accuracy}% • {(importance.model_metrics as any)?.features_used} features
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </div>

            {/* Tabs for Explanation / Importance */}
            {prediction && (
                <>
                    <div className="tab-group" style={{ width: 'fit-content', marginTop: 8 }}>
                        <button className={`tab-btn ${tab === 'explain' ? 'active' : ''}`} onClick={() => setTab('explain')}>
                            <Shield size={14} /> SHAP Explanation
                        </button>
                        <button className={`tab-btn ${tab === 'importance' ? 'active' : ''}`} onClick={() => setTab('importance')}>
                            <Zap size={14} /> Feature Importance
                        </button>
                    </div>

                    {tab === 'explain' && explanation && (
                        <div className="charts-grid">
                            <motion.div className="chart-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <h3>Feature Contributions to Prediction</h3>
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={contributionChartData} layout="vertical" margin={{ left: 100 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tick={{ fontSize: 10 }} />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                                        <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                                        <Bar dataKey="contribution" name="Contribution %">
                                            {contributionChartData.map((entry, idx) => (
                                                <Bar key={idx} dataKey="contribution" fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </motion.div>

                            <motion.div className="chart-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                                <h3>Risk Factors Analysis</h3>
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 8 }}>
                                        <AlertTriangle size={14} /> Top Risk Factors
                                    </h4>
                                    {explanation.explanation.top_risk_factors.map((f, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                                            <span style={{ fontSize: '0.82rem' }}>{f.feature.replace(/_/g, ' ')}</span>
                                            <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.82rem' }}>+{f.magnitude}%</span>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <h4 style={{ color: '#10b981', fontSize: '0.85rem', marginBottom: 8 }}>
                                        <Shield size={14} /> Protective Factors
                                    </h4>
                                    {explanation.explanation.top_protective_factors.map((f, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                                            <span style={{ fontSize: '0.82rem' }}>{f.feature.replace(/_/g, ' ')}</span>
                                            <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.82rem' }}>-{f.magnitude}%</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {tab === 'importance' && importance && (
                        <motion.div className="chart-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <h3>Global Feature Importance (Model-wide)</h3>
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={importanceChartData} layout="vertical" margin={{ left: 120 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tick={{ fontSize: 10 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                                    <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                                    <Bar dataKey="importance" fill="#06b6d4" radius={[0, 6, 6, 0]} name="Importance %" />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}
