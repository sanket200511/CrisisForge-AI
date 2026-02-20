import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Activity, Heart, AlertTriangle, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

// ─── Types ───
interface Hospital {
    id: number;
    name: string;
    region: string;
    lat: number;
    lng: number;
    total_beds: number;
    icu_beds: number;
    ventilators: number;
    total_staff: number;
    occupied_beds: number;
    occupied_icu: number;
    ventilators_in_use: number;
    active_staff: number;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── Utility Functions ───
function getOccupancyPct(occupied: number, total: number): number {
    return total > 0 ? Math.round((occupied / total) * 100) : 0;
}

function getStatusColor(pct: number): string {
    if (pct >= 90) return '#ef4444';
    if (pct >= 75) return '#f59e0b';
    if (pct >= 50) return '#06b6d4';
    return '#22c55e';
}

function getStatusLabel(pct: number): string {
    if (pct >= 90) return 'CRITICAL';
    if (pct >= 75) return 'WARNING';
    if (pct >= 50) return 'MODERATE';
    return 'STABLE';
}

// ─── Stats Badge ───
function StatBadge({ icon: Icon, label, value, color }: { icon: typeof Activity, label: string, value: string, color: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 8,
            background: `${color}15`, border: `1px solid ${color}30`,
            fontSize: '0.72rem'
        }}>
            <Icon size={12} color={color} />
            <span style={{ color: '#94a3b8' }}>{label}</span>
            <span style={{ fontWeight: 700, color }}>{value}</span>
        </div>
    );
}

// ═══════════════════════════════════════════════════
//  MAIN MAP PAGE COMPONENT
// ═══════════════════════════════════════════════════

export default function HospitalMap() {
    const { theme } = useTheme();
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.CircleMarker[]>([]);

    const NAGPUR_CENTER: L.LatLngExpression = [21.1458, 79.0882];

    const fetchData = async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/hospitals?count=8`);
            const data = await res.json();
            setHospitals(data.hospitals);
        } catch (err) {
            console.error('Failed to fetch hospitals:', err);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Cleanup old instance if present
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
            center: NAGPUR_CENTER,
            zoom: 13,
            zoomControl: false,
        });

        const tileUrl = theme === 'light'
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        L.tileLayer(tileUrl, {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [theme]);

    // Update markers when hospitals change
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || hospitals.length === 0) return;

        // Clear old markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        hospitals.forEach(h => {
            const pct = getOccupancyPct(h.occupied_beds, h.total_beds);
            const color = getStatusColor(pct);
            const ventPct = getOccupancyPct(h.ventilators_in_use, h.ventilators);
            const radius = pct >= 90 ? 18 : pct >= 75 ? 14 : 10;

            const marker = L.circleMarker([h.lat, h.lng], {
                radius,
                color: color,
                fillColor: color,
                fillOpacity: 0.35,
                weight: 2,
                opacity: 0.9,
            }).addTo(map);

            marker.bindPopup(`
                <div style="font-family: Inter, system-ui, sans-serif; min-width: 220px; padding: 4px 2px;">
                    <h3 style="margin: 0 0 2px; font-size: 0.95rem; font-weight: 700;">
                        ${h.name}
                    </h3>
                    <p style="margin: 0 0 10px; font-size: 0.72rem; opacity: 0.8;">
                        ${h.region} • Nagpur
                    </p>
                    <div style="display: inline-block; padding: 3px 10px; border-radius: 20px;
                        font-size: 0.68rem; font-weight: 700; letter-spacing: 1px;
                        background: ${color}20; color: ${color}; margin-bottom: 10px;">
                        ${getStatusLabel(pct)} — ${pct}%
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 0.74rem;">
                        <div style="padding: 6px 8px; background: rgba(148,163,184,0.1); border-radius: 6px;">
                            <span style="opacity: 0.7;">🛏️ Beds</span>
                            <p style="margin: 0; font-weight: 700;">${h.occupied_beds}/${h.total_beds}</p>
                        </div>
                        <div style="padding: 6px 8px; background: rgba(148,163,184,0.1); border-radius: 6px;">
                            <span style="opacity: 0.7;">❤️ ICU</span>
                            <p style="margin: 0; font-weight: 700;">${h.occupied_icu}/${h.icu_beds}</p>
                        </div>
                        <div style="padding: 6px 8px; background: rgba(148,163,184,0.1); border-radius: 6px;">
                            <span style="opacity: 0.7;">🫁 Vents</span>
                            <p style="margin: 0; font-weight: 700;">${h.ventilators_in_use}/${h.ventilators} (${ventPct}%)</p>
                        </div>
                        <div style="padding: 6px 8px; background: rgba(148,163,184,0.1); border-radius: 6px;">
                            <span style="opacity: 0.7;">👥 Staff</span>
                            <p style="margin: 0; font-weight: 700;">${h.active_staff}/${h.total_staff}</p>
                        </div>
                    </div>
                </div>
            `, { maxWidth: 280 });

            marker.on('click', () => setSelectedHospital(h));
            markersRef.current.push(marker);
        });
    }, [hospitals]);

    // Fly to selected hospital
    useEffect(() => {
        if (selectedHospital && mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([selectedHospital.lat, selectedHospital.lng], 15, { duration: 1 });
        }
    }, [selectedHospital]);

    // Network summary calculations
    const totalBeds = hospitals.reduce((s, h) => s + h.total_beds, 0);
    const occupiedBeds = hospitals.reduce((s, h) => s + h.occupied_beds, 0);
    const totalICU = hospitals.reduce((s, h) => s + h.icu_beds, 0);
    const occupiedICU = hospitals.reduce((s, h) => s + h.occupied_icu, 0);
    const criticalCount = hospitals.filter(h => getOccupancyPct(h.occupied_beds, h.total_beds) >= 90).length;
    const warningCount = hospitals.filter(h => { const p = getOccupancyPct(h.occupied_beds, h.total_beds); return p >= 75 && p < 90; }).length;

    return (
        <div style={{ padding: '28px 32px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MapPin size={28} color="var(--accent-cyan)" />
                        Hospital Network Map
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Live capacity monitoring across Nagpur healthcare facilities</p>
                </div>
                <button
                    onClick={fetchData}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 20px', borderRadius: 10,
                        background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
                        border: 'none', color: '#fff', fontWeight: 600,
                        fontSize: '0.85rem', cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                    <RefreshCw size={16} />
                    Refresh Data
                </button>
            </div>

            {/* Map Container */}
            <div style={{
                flex: 1, borderRadius: 16, overflow: 'hidden', position: 'relative',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}>
                <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

                {/* Legend overlay */}
                <div style={{
                    position: 'absolute', bottom: 24, left: 24, zIndex: 1000,
                    background: 'var(--bg-card)', backdropFilter: 'blur(12px)',
                    border: '1px solid var(--border-subtle)', borderRadius: 12,
                    padding: '14px 18px', color: 'var(--text-primary)', fontSize: '0.78rem',
                    boxShadow: 'var(--shadow-card)'
                }}>
                    <p style={{ fontWeight: 700, marginBottom: 8, color: 'var(--accent-cyan)', letterSpacing: 1, margin: '0 0 8px' }}>HOSPITAL STATUS</p>
                    {[
                        { color: '#22c55e', label: 'Stable (< 50%)' },
                        { color: '#06b6d4', label: 'Moderate (50–74%)' },
                        { color: '#f59e0b', label: 'Warning (75–89%)' },
                        { color: '#ef4444', label: 'Critical (≥ 90%)' },
                    ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block', boxShadow: `0 0 8px ${item.color}60` }} />
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* Network summary overlay */}
                {hospitals.length > 0 && (
                    <div style={{
                        position: 'absolute', top: 24, right: 24, zIndex: 1000,
                        background: 'var(--bg-card)', backdropFilter: 'blur(12px)',
                        border: '1px solid var(--border-subtle)', borderRadius: 14,
                        padding: '18px 22px', color: 'var(--text-primary)', width: 270,
                        boxShadow: 'var(--shadow-card)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <Activity size={16} color="var(--accent-cyan)" />
                            <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: 1, color: 'var(--accent-cyan)' }}>NETWORK STATUS</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                            <div style={{ textAlign: 'center', padding: '8px 0', borderRadius: 8, background: 'var(--bg-tertiary)' }}>
                                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: 0 }}>{hospitals.length}</p>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Hospitals</p>
                            </div>
                            <div style={{ textAlign: 'center', padding: '8px 0', borderRadius: 8, background: 'var(--bg-tertiary)' }}>
                                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: getStatusColor(getOccupancyPct(occupiedBeds, totalBeds)), margin: 0 }}>
                                    {getOccupancyPct(occupiedBeds, totalBeds)}%
                                </p>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>Avg Load</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            <StatBadge icon={Heart} label="Beds" value={`${occupiedBeds}/${totalBeds}`} color="#06b6d4" />
                            <StatBadge icon={Activity} label="ICU" value={`${occupiedICU}/${totalICU}`} color="#a855f7" />
                            {criticalCount > 0 && <StatBadge icon={AlertTriangle} label="Critical" value={`${criticalCount}`} color="#ef4444" />}
                            {warningCount > 0 && <StatBadge icon={AlertTriangle} label="Warning" value={`${warningCount}`} color="#f59e0b" />}
                        </div>
                    </div>
                )}

                {/* City label */}
                <div style={{
                    position: 'absolute', top: 24, left: 24, zIndex: 1000,
                    background: 'var(--bg-card)', backdropFilter: 'blur(12px)',
                    border: '1px solid var(--border-subtle)', borderRadius: 10,
                    padding: '10px 16px', boxShadow: 'var(--shadow-card)'
                }}>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        📍 <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>Nagpur, Maharashtra</span> • {hospitals.length} Facilities
                    </p>
                </div>
            </div>

            {/* Hospital Quick Cards */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 12, marginTop: 16,
            }}>
                {hospitals.map(h => {
                    const pct = getOccupancyPct(h.occupied_beds, h.total_beds);
                    const color = getStatusColor(pct);
                    const isSelected = selectedHospital?.id === h.id;

                    return (
                        <div
                            key={h.id}
                            onClick={() => setSelectedHospital(h)}
                            style={{
                                padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                                background: isSelected ? `${color}15` : 'var(--bg-card)',
                                border: `1px solid ${isSelected ? color : 'var(--border-subtle)'}`,
                                transition: 'all 0.2s',
                                transform: isSelected ? 'translateY(-2px)' : 'none',
                                boxShadow: isSelected ? `0 4px 15px ${color}30` : 'var(--shadow-card)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{h.name}</p>
                                <span style={{
                                    width: 8, height: 8, borderRadius: '50%', background: color,
                                    boxShadow: `0 0 8px ${color}80`,
                                }} />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                <span>🛏️ {pct}%</span>
                                <span>❤️ {getOccupancyPct(h.occupied_icu, h.icu_beds)}%</span>
                                <span>📍 {h.region}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
