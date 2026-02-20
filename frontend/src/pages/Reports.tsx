import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Clock, Activity, TrendingUp, CheckCircle } from 'lucide-react';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { api } from '../api';
import type { DashboardSummary } from '../api';

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function Reports() {
    const [data, setData] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getDashboard().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading || !data) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p className="loading-text">Generating reports...</p>
            </div>
        );
    }

    const { overview, hospitals, recent_admissions } = data;

    const capacityData = [
        { name: 'Beds', used: overview.occupied_beds, total: overview.total_beds, pct: overview.bed_occupancy },
        { name: 'ICU', used: overview.occupied_icu, total: overview.total_icu, pct: overview.icu_occupancy },
        { name: 'Ventilators', used: overview.ventilators_in_use, total: overview.total_ventilators, pct: overview.ventilator_usage },
        { name: 'Staff', used: overview.active_staff, total: overview.total_staff, pct: overview.staff_utilization },
    ];

    const regionData = hospitals.reduce<Record<string, { beds: number; patients: number }>>((acc, h) => {
        if (!acc[h.region]) acc[h.region] = { beds: 0, patients: 0 };
        acc[h.region].beds += h.total_beds;
        acc[h.region].patients += h.occupied_beds;
        return acc;
    }, {});

    const pieData = Object.entries(regionData).map(([region, val]) => ({
        name: region,
        value: val.beds,
    }));

    const regionBarData = Object.entries(regionData).map(([region, val]) => ({
        region,
        capacity: val.beds,
        occupied: val.patients,
        utilization: Math.round((val.patients / val.beds) * 100),
    }));

    return (
        <div>
            <motion.div className="page-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2>Reports & Analytics</h2>
                        <p>Comprehensive resource utilization analysis</p>
                    </div>
                    <button className="btn btn-secondary" onClick={() => {
                        if (!data) return;
                        const rows = [
                            ['CrisisForge AI - Network Report', '', '', '', '', ''],
                            ['Generated', new Date().toLocaleString(), '', '', '', ''],
                            [''],
                            ['Hospital', 'Region', 'Total Beds', 'Occupied', 'Occupancy %', 'Status'],
                            ...data.hospitals.map(h => [
                                h.name, h.region, h.total_beds, h.occupied_beds,
                                Math.round((h.occupied_beds / h.total_beds) * 100) + '%',
                                (h.occupied_beds / h.total_beds) >= 0.9 ? 'CRITICAL' : (h.occupied_beds / h.total_beds) >= 0.75 ? 'WARNING' : 'STABLE'
                            ]),
                            [''],
                            ['Network Summary', '', '', '', '', ''],
                            ['Total Beds', data.overview.total_beds, 'Occupied', data.overview.occupied_beds, 'Utilization', data.overview.bed_occupancy + '%'],
                            ['Total ICU', data.overview.total_icu, 'Occupied ICU', data.overview.occupied_icu, 'ICU Utilization', data.overview.icu_occupancy + '%'],
                        ];
                        const csv = rows.map(r => r.join(',')).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url;
                        a.download = `crisisforge_report_${new Date().toISOString().slice(0, 10)}.csv`;
                        a.click(); URL.revokeObjectURL(url);
                    }}>
                        <Download size={16} /> Export CSV
                    </button>
                    <button className="btn btn-secondary" onClick={() => window.print()}>
                        <FileText size={16} /> Export PDF
                    </button>
                </div>
            </motion.div>

            {/* Summary Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <motion.div className="stat-card cyan" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <p className="stat-label">Total Facilities</p>
                    <p className="stat-value cyan">{hospitals.length}</p>
                    <p className="stat-detail">Active & monitored</p>
                </motion.div>
                <motion.div className="stat-card blue" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <p className="stat-label">30-Day Admissions</p>
                    <p className="stat-value blue">{recent_admissions.total.toLocaleString()}</p>
                    <p className="stat-detail">Avg: {recent_admissions.avg_daily}/day</p>
                </motion.div>
                <motion.div className="stat-card amber" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <p className="stat-label">Peak Daily</p>
                    <p className="stat-value amber">{recent_admissions.peak_daily}</p>
                    <p className="stat-detail">patients in one day</p>
                </motion.div>
                <motion.div className="stat-card green" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <p className="stat-label">Overall Utilization</p>
                    <p className="stat-value green">{overview.bed_occupancy}%</p>
                    <p className="stat-detail">bed occupancy rate</p>
                </motion.div>
            </div>

            {/* Capacity Breakdown */}
            <div className="charts-grid">
                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h3><Activity size={18} style={{ color: '#06b6d4' }} /> Resource Capacity Overview</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={capacityData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                            <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                            <Bar dataKey="total" fill="rgba(148,163,184,0.2)" radius={[0, 4, 4, 0]} name="Total Capacity" />
                            <Bar dataKey="used" fill="#06b6d4" radius={[0, 4, 4, 0]} name="Currently Used" />
                            <Legend />
                        </BarChart>
                    </ResponsiveContainer>
                </motion.div>

                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <h3><TrendingUp size={18} style={{ color: '#8b5cf6' }} /> Bed Distribution by Region</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="value" label={((props: any) => `${props.name || ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`) as any} labelLine={false}>
                                {pieData.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </motion.div>
            </div>

            {/* Regional Utilization */}
            <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h3><FileText size={18} style={{ color: '#f59e0b' }} /> Regional Utilization Breakdown</h3>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={regionBarData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="region" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 8 }} />
                        <Bar dataKey="capacity" fill="rgba(148,163,184,0.2)" radius={[4, 4, 0, 0]} name="Capacity" />
                        <Bar dataKey="occupied" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Occupied" />
                        <Legend />
                    </BarChart>
                </ResponsiveContainer>
            </motion.div>

            {/* Key Findings */}
            <motion.div className="card" style={{ marginTop: 20 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <div className="card-header">
                    <span className="card-title">Key Findings & Recommendations</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {[
                        { icon: <CheckCircle size={16} style={{ color: '#10b981' }} />, text: `Average bed occupancy is ${overview.bed_occupancy}% — ${overview.bed_occupancy > 80 ? 'approaching capacity limits' : 'within safe thresholds'}` },
                        { icon: <Activity size={16} style={{ color: '#06b6d4' }} />, text: `ICU utilization at ${overview.icu_occupancy}% — ${overview.icu_occupancy > 85 ? 'critical: surge capacity plan needed' : 'monitor closely'}` },
                        { icon: <Clock size={16} style={{ color: '#f59e0b' }} />, text: `Peak admission day saw ${recent_admissions.peak_daily} patients — recommend stress testing at 2x this load` },
                        { icon: <TrendingUp size={16} style={{ color: '#8b5cf6' }} />, text: `Staff utilization at ${overview.staff_utilization}% — ${overview.staff_utilization > 90 ? 'high burnout risk' : 'manageable workload'}` },
                    ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0' }}>
                            {item.icon}
                            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.text}</p>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
