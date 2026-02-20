import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCw } from 'lucide-react';
import {
    AreaChart, Area, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { api } from '../api';
import type { Scenario, SimulationResult } from '../api';

export default function ScenarioBuilder() {
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [selected, setSelected] = useState<Scenario | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);

    // Custom parameters
    const [duration, setDuration] = useState(30);
    const [surge, setSurge] = useState(2.0);
    const [basePats, setBasePats] = useState(40);
    const [beds, setBeds] = useState(200);
    const [icu, setIcu] = useState(30);
    const [vents, setVents] = useState(20);

    useEffect(() => {
        api.getScenarios().then(d => {
            setScenarios(d.scenarios);
            if (d.scenarios.length > 0) {
                const first = d.scenarios[0];
                setSelected(first);
                setDuration(first.duration_days);
                setSurge(first.surge_multiplier);
            }
        });
    }, []);

    const handleSelect = (s: Scenario) => {
        setSelected(s);
        setDuration(s.duration_days);
        setSurge(s.surge_multiplier);
        setResult(null);
    };

    const runSimulation = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            const res = await api.simulate({
                crisis_type: selected.crisis_type,
                duration_days: duration,
                surge_multiplier: surge,
                base_daily_patients: basePats,
                hospital_beds: beds,
                hospital_icu: icu,
                hospital_ventilators: vents,
            });
            setResult(res);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const inflowChartData = result
        ? result.inflow_forecast.days.map((d, i) => ({
            day: d,
            predicted: Math.round(result.inflow_forecast.mean[i]),
            baseline: Math.round(result.inflow_forecast.base_no_crisis[i]),
            p10: Math.round(result.inflow_forecast.p10[i]),
            p90: Math.round(result.inflow_forecast.p90[i]),
        }))
        : [];

    const resourceChartData = result
        ? result.resource_forecast.days.map((d, i) => ({
            day: d,
            beds: result.resource_forecast.beds_needed[i],
            icu: result.resource_forecast.icu_needed[i],
            ventilators: result.resource_forecast.ventilators_needed[i],
            staff: result.resource_forecast.staff_needed[i],
        }))
        : [];

    return (
        <div>
            <motion.div className="page-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2>Scenario Builder</h2>
                <p>Configure crisis scenarios and generate predictive models</p>
            </motion.div>

            <div className="scenario-builder">
                {/* Left Panel */}
                <div>
                    <div className="scenario-panel" style={{ marginBottom: 16 }}>
                        <div className="card-title" style={{ marginBottom: 16 }}>Crisis Presets</div>
                        {scenarios.map((s) => (
                            <button
                                key={s.id}
                                className={`scenario-preset ${selected?.id === s.id ? 'active' : ''}`}
                                onClick={() => handleSelect(s)}
                            >
                                <span className="preset-icon">{s.icon}</span>
                                <div>
                                    <div className="preset-name">{s.name}</div>
                                    <div className="preset-severity">{s.severity} • {s.duration_days} days</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="scenario-panel">
                        <div className="card-title" style={{ marginBottom: 16 }}>Parameters</div>

                        <div className="form-group">
                            <div className="slider-row">
                                <label className="form-label" style={{ marginBottom: 0 }}>Duration (days)</label>
                                <span className="form-value">{duration}</span>
                            </div>
                            <input type="range" className="form-slider" min={7} max={180} value={duration} onChange={e => setDuration(+e.target.value)} />
                        </div>

                        <div className="form-group">
                            <div className="slider-row">
                                <label className="form-label" style={{ marginBottom: 0 }}>Surge Multiplier</label>
                                <span className="form-value">{surge.toFixed(1)}x</span>
                            </div>
                            <input type="range" className="form-slider" min={10} max={50} value={surge * 10} onChange={e => setSurge(+e.target.value / 10)} />
                        </div>

                        <div className="form-group">
                            <div className="slider-row">
                                <label className="form-label" style={{ marginBottom: 0 }}>Base Daily Patients</label>
                                <span className="form-value">{basePats}</span>
                            </div>
                            <input type="range" className="form-slider" min={5} max={200} value={basePats} onChange={e => setBasePats(+e.target.value)} />
                        </div>

                        <div className="form-group">
                            <div className="slider-row">
                                <label className="form-label" style={{ marginBottom: 0 }}>Hospital Beds</label>
                                <span className="form-value">{beds}</span>
                            </div>
                            <input type="range" className="form-slider" min={10} max={1000} value={beds} onChange={e => setBeds(+e.target.value)} />
                        </div>

                        <div className="form-group">
                            <div className="slider-row">
                                <label className="form-label" style={{ marginBottom: 0 }}>ICU Beds</label>
                                <span className="form-value">{icu}</span>
                            </div>
                            <input type="range" className="form-slider" min={1} max={200} value={icu} onChange={e => setIcu(+e.target.value)} />
                        </div>

                        <div className="form-group">
                            <div className="slider-row">
                                <label className="form-label" style={{ marginBottom: 0 }}>Ventilators</label>
                                <span className="form-value">{vents}</span>
                            </div>
                            <input type="range" className="form-slider" min={1} max={150} value={vents} onChange={e => setVents(+e.target.value)} />
                        </div>

                        <button className="btn btn-primary btn-block btn-lg" onClick={runSimulation} disabled={loading || !selected}>
                            {loading ? <><RotateCw size={18} className="spin" /> Running...</> : <><Play size={18} /> Run Simulation</>}
                        </button>
                    </div>
                </div>

                {/* Right Panel — Results */}
                <div>
                    {!result && !loading && (
                        <div className="card" style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                            <div style={{ fontSize: '3rem', opacity: 0.3 }}>🧪</div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select a scenario and click "Run Simulation" to see predictions</p>
                        </div>
                    )}

                    {loading && (
                        <div className="loading-container">
                            <div className="loading-spinner" />
                            <p className="loading-text">Running simulation engine...</p>
                        </div>
                    )}

                    {result && (
                        <>
                            {/* Inflow Prediction Chart */}
                            <motion.div className="chart-card" style={{ marginBottom: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                <h3>📈 Patient Inflow Prediction</h3>
                                <ResponsiveContainer width="100%" height={320}>
                                    <AreaChart data={inflowChartData}>
                                        <defs>
                                            <linearGradient id="gradPred" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradConf" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                                        <Area type="monotone" dataKey="p90" stroke="none" fill="url(#gradConf)" name="90th Percentile" />
                                        <Area type="monotone" dataKey="p10" stroke="none" fill="transparent" name="10th Percentile" />
                                        <Line type="monotone" dataKey="baseline" stroke="#64748b" strokeDasharray="5 5" strokeWidth={1.5} dot={false} name="Baseline (no crisis)" />
                                        <Area type="monotone" dataKey="predicted" stroke="#06b6d4" fill="url(#gradPred)" strokeWidth={2.5} name="Predicted Inflow" />
                                        <Legend />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </motion.div>

                            {/* Resource Forecast */}
                            <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <h3>📊 Resource Consumption Forecast</h3>
                                <ResponsiveContainer width="100%" height={320}>
                                    <LineChart data={resourceChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                                        <Line type="monotone" dataKey="beds" stroke="#06b6d4" strokeWidth={2} dot={false} name="Beds Needed" />
                                        <Line type="monotone" dataKey="icu" stroke="#ef4444" strokeWidth={2} dot={false} name="ICU Needed" />
                                        <Line type="monotone" dataKey="ventilators" stroke="#f59e0b" strokeWidth={2} dot={false} name="Ventilators Needed" />
                                        <Line type="monotone" dataKey="staff" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Staff Needed" />
                                        <Legend />
                                    </LineChart>
                                </ResponsiveContainer>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
