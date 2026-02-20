import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, AlertTriangle, RefreshCw, Ambulance, Activity } from 'lucide-react';
import {
    BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../api';
import type { TransferResult } from '../api';

const STATUS_COLORS: Record<string, string> = {
    critical: '#ef4444',
    overloaded: '#f59e0b',
    stable: '#06b6d4',
    available: '#10b981',
};

export default function TransferHub() {
    const [data, setData] = useState<TransferResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTransfers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.getTransfers(6);
            setData(res);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch transfer data');
        }
        setLoading(false);
    };

    useEffect(() => { fetchTransfers(); }, []);

    const pressureChartData = data?.hospital_status.map(h => ({
        name: h.name.split(' ').slice(0, 2).join(' '),
        pressure: h.pressure,
        fill: STATUS_COLORS[h.status] || '#64748b',
    })) || [];

    const getPriorityBadge = (p: string) => {
        const cls = p === 'critical' ? 'critical' : p === 'high' ? 'warning' : 'ok';
        return <span className={`badge ${cls}`}>{p.toUpperCase()}</span>;
    };

    return (
        <div>
            <motion.div className="page-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2>🚑 Transfer Hub</h2>
                <p>Autonomous inter-hospital patient transfer optimization</p>
            </motion.div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <button className="btn btn-primary" onClick={fetchTransfers} disabled={loading}>
                    <RefreshCw size={16} /> {loading ? 'Analyzing...' : 'Refresh Network'}
                </button>
            </div>

            {error && (
                <div className="card" style={{ borderLeft: '3px solid #ef4444', marginBottom: 20 }}>
                    <p style={{ color: '#ef4444' }}>⚠️ {error}</p>
                </div>
            )}

            {loading && !data && (
                <div className="loading-container">
                    <div className="loading-spinner" />
                    <p className="loading-text">Analyzing hospital network...</p>
                </div>
            )}

            {data && (
                <>
                    {/* Network Summary Cards */}
                    <div className="stats-grid">
                        <motion.div className="stat-card cyan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="stat-icon"><Activity /></div>
                            <p className="stat-label">Network Pressure</p>
                            <p className="stat-value cyan">{data.network_summary.avg_network_pressure}%</p>
                            <p className="stat-detail">Avg across {data.network_summary.total_hospitals} hospitals</p>
                        </motion.div>

                        <motion.div className="stat-card red" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                            <div className="stat-icon"><AlertTriangle /></div>
                            <p className="stat-label">Critical Facilities</p>
                            <p className="stat-value red">{data.network_summary.critical_hospitals}</p>
                            <p className="stat-detail">{data.network_summary.overloaded_hospitals} overloaded</p>
                        </motion.div>

                        <motion.div className="stat-card green" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <div className="stat-icon"><Ambulance /></div>
                            <p className="stat-label">Transfers Needed</p>
                            <p className="stat-value green">{data.total_patients_to_transfer}</p>
                            <p className="stat-detail">{data.recommended_transfers.length} recommendations</p>
                        </motion.div>

                        <motion.div className="stat-card amber" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                            <div className="stat-icon"><ArrowRight /></div>
                            <p className="stat-label">Expected Improvement</p>
                            <p className="stat-value amber">{data.network_summary.pressure_improvement}%</p>
                            <p className="stat-detail">Post-transfer: {data.network_summary.post_transfer_pressure}%</p>
                        </motion.div>
                    </div>

                    {/* Pressure Chart */}
                    <div className="charts-grid">
                        <motion.div className="chart-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                            <h3>Hospital Pressure Index</h3>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={pressureChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                                    <Bar dataKey="pressure" radius={[6, 6, 0, 0]} name="Pressure %">
                                        {pressureChartData.map((entry, idx) => (
                                            <Cell key={idx} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* Hospital Status */}
                        <motion.div className="chart-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                            <h3>Facility Status</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {data.hospital_status.map((h, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[h.status] || '#64748b', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{h.name}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{h.region} • {h.available_beds} beds, {h.available_icu} ICU free</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 700, color: STATUS_COLORS[h.status], fontSize: '0.95rem' }}>{h.pressure}%</div>
                                            <span className={`badge ${h.status === 'critical' ? 'critical' : h.status === 'overloaded' ? 'warning' : 'ok'}`}>
                                                {h.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Transfer Recommendations */}
                    {data.recommended_transfers.length > 0 && (
                        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <div className="card-header">
                                <span className="card-title">🚑 Transfer Recommendations</span>
                                <span className="badge warning">{data.recommended_transfers.length} transfers</span>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="hospital-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Priority</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Patients</th>
                                            <th>Distance</th>
                                            <th>ETA</th>
                                            <th>Pressure ↓</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.recommended_transfers.map(t => (
                                            <tr key={t.id}>
                                                <td style={{ fontWeight: 700 }}>{t.id}</td>
                                                <td>{getPriorityBadge(t.priority)}</td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{t.from_hospital}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#ef4444' }}>{t.from_pressure}% load</div>
                                                </td>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{t.to_hospital}</div>
                                                    <div style={{ fontSize: '0.72rem', color: '#10b981' }}>{t.to_pressure}% load</div>
                                                </td>
                                                <td>
                                                    <span style={{ fontWeight: 600 }}>{t.total_patients}</span>
                                                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}> ({t.patients_general}G + {t.patients_icu}I)</span>
                                                </td>
                                                <td>{t.distance_km} km</td>
                                                <td>{t.estimated_transfer_time_min} min</td>
                                                <td style={{ color: '#10b981', fontWeight: 600 }}>-{t.pressure_reduction}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </>
            )}
        </div>
    );
}
