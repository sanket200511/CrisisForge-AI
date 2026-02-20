import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCw, TrendingUp, Users, Shield, Zap } from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, Cell, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { api } from '../api';
import type { SimulationResult } from '../api';

const CRISIS_OPTIONS = [
    { key: 'pandemic', label: '🦠 Pandemic' },
    { key: 'earthquake', label: '🏚️ Earthquake' },
    { key: 'flood', label: '🌊 Flood' },
    { key: 'staff_shortage', label: '👨‍⚕️ Staff Shortage' },
];

export default function StrategyComparator() {
    const [crisis, setCrisis] = useState('pandemic');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [viewMode, setViewMode] = useState<'timeline' | 'summary' | 'radar'>('summary');

    const runComparison = async () => {
        setLoading(true);
        try {
            const res = await api.simulate({
                crisis_type: crisis,
                duration_days: 30,
                surge_multiplier: 2.5,
                base_daily_patients: 50,
                hospital_beds: 200,
                hospital_icu: 30,
                hospital_ventilators: 20,
            });
            setResult(res);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const stratKeys = result ? Object.keys(result.strategies) : [];
    const strategies = result?.strategies;

    const timelineData = result
        ? result.inflow_forecast.days.map((d, i) => {
            const point: Record<string, number> = { day: d };
            stratKeys.forEach(k => {
                const tl = strategies![k].timeline[i];
                if (tl) {
                    point[`${k}_mortality`] = tl.mortality_estimate;
                    point[`${k}_denied`] = tl.cumulative_denied;
                }
            });
            return point;
        })
        : [];

    const summaryBarData = stratKeys.map(k => ({
        name: strategies![k].name,
        survival_rate: strategies![k].summary.survival_rate,
        utilization: strategies![k].summary.avg_utilization,
        denied: strategies![k].summary.total_denied,
        deaths: strategies![k].summary.estimated_deaths,
        fill: strategies![k].color,
    }));

    const radarData = stratKeys.length > 0 ? [
        { metric: 'Survival Rate', ...Object.fromEntries(stratKeys.map(k => [k, strategies![k].summary.survival_rate])) },
        { metric: 'Utilization', ...Object.fromEntries(stratKeys.map(k => [k, strategies![k].summary.avg_utilization])) },
        { metric: 'Low Mortality', ...Object.fromEntries(stratKeys.map(k => [k, Math.max(0, 100 - strategies![k].summary.estimated_deaths)])) },
        { metric: 'Low Denial', ...Object.fromEntries(stratKeys.map(k => [k, Math.max(0, 100 - strategies![k].summary.total_denied / Math.max(strategies![k].summary.total_patients, 1) * 100)])) },
        { metric: 'Low Wait', ...Object.fromEntries(stratKeys.map(k => [k, Math.max(0, 100 - strategies![k].summary.avg_wait_time * 10)])) },
    ] : [];

    const STRAT_COLORS: Record<string, string> = { fcfs: '#EF4444', severity: '#F59E0B', equity: '#8B5CF6', optimized: '#10B981' };

    const getIcon = (key: string) => {
        switch (key) {
            case 'fcfs': return <Users size={18} />;
            case 'severity': return <Shield size={18} />;
            case 'equity': return <TrendingUp size={18} />;
            case 'optimized': return <Zap size={18} />;
            default: return null;
        }
    };

    const getMetricClass = (_key: string, metric: string, value: number) => {
        if (metric === 'survival_rate') return value > 95 ? 'good' : value > 90 ? 'warn' : 'bad';
        if (metric === 'deaths') return value < 10 ? 'good' : value < 30 ? 'warn' : 'bad';
        if (metric === 'denied') return value < 20 ? 'good' : value < 50 ? 'warn' : 'bad';
        return '';
    };

    return (
        <div>
            <motion.div className="page-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2>Strategy Comparator</h2>
                <p>Compare allocation strategies side-by-side</p>
            </motion.div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="tab-group">
                    {CRISIS_OPTIONS.map(c => (
                        <button key={c.key} className={`tab-btn ${crisis === c.key ? 'active' : ''}`} onClick={() => { setCrisis(c.key); setResult(null); }}>
                            {c.label}
                        </button>
                    ))}
                </div>
                <button className="btn btn-primary" onClick={runComparison} disabled={loading}>
                    {loading ? <><RotateCw size={16} /> Running...</> : <><Play size={16} /> Compare Strategies</>}
                </button>
            </div>

            {loading && (
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <p className="loading-text">Simulating all strategies...</p>
                </div>
            )}

            {!result && !loading && (
                <div className="card" style={{ minHeight: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: '3rem', opacity: 0.3 }}>⚖️</div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select a crisis type and click "Compare Strategies"</p>
                </div>
            )}

            {result && (
                <>
                    {/* Strategy Summary Cards */}
                    <div className="strategy-grid">
                        {stratKeys.map((k, i) => {
                            const s = strategies![k];
                            return (
                                <motion.div key={k} className="strategy-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} style={{ borderTop: `3px solid ${s.color}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                        <span style={{ color: s.color }}>{getIcon(k)}</span>
                                        <span className="strategy-name" style={{ color: s.color }}>{s.name}</span>
                                    </div>
                                    <div className="strategy-metric">
                                        <span className="metric-label">Survival Rate</span>
                                        <span className={`metric-value ${getMetricClass(k, 'survival_rate', s.summary.survival_rate)}`}>{s.summary.survival_rate}%</span>
                                    </div>
                                    <div className="strategy-metric">
                                        <span className="metric-label">Total Treated</span>
                                        <span className="metric-value" style={{ color: '#f1f5f9' }}>{s.summary.total_treated.toLocaleString()}</span>
                                    </div>
                                    <div className="strategy-metric">
                                        <span className="metric-label">Denied Care</span>
                                        <span className={`metric-value ${getMetricClass(k, 'denied', s.summary.total_denied)}`}>{s.summary.total_denied}</span>
                                    </div>
                                    <div className="strategy-metric">
                                        <span className="metric-label">Est. Deaths</span>
                                        <span className={`metric-value ${getMetricClass(k, 'deaths', s.summary.estimated_deaths)}`}>{s.summary.estimated_deaths}</span>
                                    </div>
                                    <div className="strategy-metric">
                                        <span className="metric-label">Avg Wait (hrs)</span>
                                        <span className="metric-value" style={{ color: '#94a3b8' }}>{s.summary.avg_wait_time}</span>
                                    </div>
                                    <div className="strategy-metric">
                                        <span className="metric-label">Avg Utilization</span>
                                        <span className="metric-value" style={{ color: '#06b6d4' }}>{s.summary.avg_utilization}%</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* View Tabs */}
                    <div className="tab-group" style={{ width: 'fit-content' }}>
                        <button className={`tab-btn ${viewMode === 'summary' ? 'active' : ''}`} onClick={() => setViewMode('summary')}>Summary</button>
                        <button className={`tab-btn ${viewMode === 'timeline' ? 'active' : ''}`} onClick={() => setViewMode('timeline')}>Timeline</button>
                        <button className={`tab-btn ${viewMode === 'radar' ? 'active' : ''}`} onClick={() => setViewMode('radar')}>Radar</button>
                    </div>

                    {viewMode === 'summary' && (
                        <div className="charts-grid">
                            <motion.div className="chart-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <h3>Survival Rate by Strategy</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={summaryBarData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} domain={[85, 100]} />
                                        <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                                        <Bar dataKey="survival_rate" radius={[6, 6, 0, 0]} name="Survival Rate %">
                                            {summaryBarData.map((entry, idx) => (
                                                <Cell key={idx} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </motion.div>

                            <motion.div className="chart-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                                <h3>Estimated Deaths Comparison</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={summaryBarData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                                        <Bar dataKey="deaths" radius={[6, 6, 0, 0]} fill="#ef4444" name="Estimated Deaths" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </motion.div>
                        </div>
                    )}

                    {viewMode === 'timeline' && (
                        <div className="charts-grid full">
                            <motion.div className="chart-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <h3>Cumulative Mortality Over Time</h3>
                                <ResponsiveContainer width="100%" height={380}>
                                    <LineChart data={timelineData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                                        {stratKeys.map(k => (
                                            <Line key={k} type="monotone" dataKey={`${k}_mortality`} stroke={STRAT_COLORS[k] || '#06b6d4'} strokeWidth={2} dot={false} name={strategies![k].name} />
                                        ))}
                                        <Legend />
                                    </LineChart>
                                </ResponsiveContainer>
                            </motion.div>
                        </div>
                    )}

                    {viewMode === 'radar' && radarData.length > 0 && (
                        <motion.div className="chart-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <h3>Multi-Dimensional Strategy Comparison</h3>
                            <ResponsiveContainer width="100%" height={420}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="rgba(148,163,184,0.15)" />
                                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                                    <PolarRadiusAxis tick={{ fontSize: 9, fill: '#64748b' }} domain={[0, 100]} />
                                    {stratKeys.map(k => (
                                        <Radar key={k} name={strategies![k].name} dataKey={k} stroke={STRAT_COLORS[k] || '#06b6d4'} fill={STRAT_COLORS[k] || '#06b6d4'} fillOpacity={0.15} strokeWidth={2} />
                                    ))}
                                    <Legend />
                                </RadarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}
