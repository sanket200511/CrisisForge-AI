import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { AlertTriangle, Activity, Bed, Heart, Users, Wind } from 'lucide-react';
import { api } from '../api';
import type { DashboardSummary } from '../api';

export default function Dashboard() {
    const [data, setData] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.getDashboard()
            .then(d => { setData(d); setLoading(false); })
            .catch(err => { setError(err.message || 'Failed to load dashboard'); setLoading(false); });
    }, []);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p className="loading-text">Loading dashboard data...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="loading-container">
                <div style={{ fontSize: '3rem' }}>⚠️</div>
                <p style={{ color: '#ef4444', fontSize: '1rem', fontWeight: 600 }}>
                    {error || 'Failed to load data'}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 8 }}>
                    Make sure the backend is running at <code style={{ color: '#06b6d4' }}>http://localhost:8000</code>
                </p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>
                    Retry
                </button>
            </div>
        );
    }

    const { overview, recent_admissions, hospitals, alerts } = data;

    // Safely build chart data
    const admissionChartData = (recent_admissions?.days || []).map((d: number, i: number) => ({
        day: `Day ${d}`,
        admissions: recent_admissions.admissions?.[i] ?? 0,
        discharges: recent_admissions.discharges?.[i] ?? 0,
        icu: recent_admissions.icu_admissions?.[i] ?? 0,
    }));

    const getOccColor = (pct: number) =>
        pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#10b981';

    return (
        <div>
            <motion.div className="page-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2>Command Center</h2>
                <p>Real-time capacity monitoring across {data.hospitals_count} facilities</p>
            </motion.div>

            {/* Alerts */}
            {alerts && alerts.length > 0 && (
                <div className="alerts-panel">
                    {alerts.slice(0, 3).map((a, i) => (
                        <motion.div key={i} className={`alert-item ${a.level}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                            <AlertTriangle size={16} />
                            <strong>{a.hospital}</strong> — {a.message}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Stat Cards */}
            <div className="stats-grid">
                <motion.div className="stat-card cyan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div className="stat-icon"><Bed /></div>
                    <p className="stat-label">Bed Occupancy</p>
                    <p className="stat-value cyan">{overview.bed_occupancy}%</p>
                    <p className="stat-detail">{overview.occupied_beds} / {overview.total_beds} beds</p>
                </motion.div>

                <motion.div className="stat-card red" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div className="stat-icon"><Heart /></div>
                    <p className="stat-label">ICU Occupancy</p>
                    <p className="stat-value red">{overview.icu_occupancy}%</p>
                    <p className="stat-detail">{overview.occupied_icu} / {overview.total_icu} ICU beds</p>
                </motion.div>

                <motion.div className="stat-card amber" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="stat-icon"><Wind /></div>
                    <p className="stat-label">Ventilator Usage</p>
                    <p className="stat-value amber">{overview.ventilator_usage}%</p>
                    <p className="stat-detail">{overview.ventilators_in_use} / {overview.total_ventilators} units</p>
                </motion.div>

                <motion.div className="stat-card green" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <div className="stat-icon"><Users /></div>
                    <p className="stat-label">Staff Utilization</p>
                    <p className="stat-value green">{overview.staff_utilization}%</p>
                    <p className="stat-detail">{overview.active_staff} / {overview.total_staff} staff</p>
                </motion.div>
            </div>

            {/* Charts */}
            <div className="charts-grid">
                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <h3><Activity size={18} style={{ color: '#06b6d4' }} /> Patient Admissions Trend</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={admissionChartData}>
                            <defs>
                                <linearGradient id="gradAdmit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradDischarge" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                            <Area type="monotone" dataKey="admissions" stroke="#06b6d4" fill="url(#gradAdmit)" strokeWidth={2} name="Admissions" />
                            <Area type="monotone" dataKey="discharges" stroke="#10b981" fill="url(#gradDischarge)" strokeWidth={2} name="Discharges" />
                            <Legend />
                        </AreaChart>
                    </ResponsiveContainer>
                </motion.div>

                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                    <h3><Heart size={18} style={{ color: '#ef4444' }} /> ICU Admissions</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={admissionChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }} />
                            <Bar dataKey="icu" fill="#ef4444" radius={[4, 4, 0, 0]} name="ICU Admissions" />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>

            {/* Hospital Table */}
            <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="card-header">
                    <span className="card-title">Facility Status</span>
                    <span className="badge ok">{hospitals.length} facilities online</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="hospital-table">
                        <thead>
                            <tr>
                                <th>Hospital</th>
                                <th>Region</th>
                                <th>Beds</th>
                                <th>ICU</th>
                                <th>Ventilators</th>
                                <th>Staff</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hospitals.map((h, i) => {
                                const bedPct = Math.round((h.occupied_beds / Math.max(h.total_beds, 1)) * 100);
                                return (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{h.name}</td>
                                        <td style={{ color: '#94a3b8' }}>{h.region}</td>
                                        <td>
                                            {h.occupied_beds}/{h.total_beds}
                                            <div className="occupancy-bar">
                                                <div className="occupancy-fill" style={{ width: `${bedPct}%`, background: getOccColor(bedPct) }} />
                                            </div>
                                        </td>
                                        <td>{h.occupied_icu}/{h.icu_beds}</td>
                                        <td>{h.ventilators_in_use}/{h.ventilators}</td>
                                        <td>{h.active_staff}/{h.total_staff}</td>
                                        <td>
                                            <span className={`badge ${bedPct > 90 ? 'critical' : bedPct > 75 ? 'warning' : 'ok'}`}>
                                                {bedPct > 90 ? 'Critical' : bedPct > 75 ? 'Warning' : 'Normal'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
