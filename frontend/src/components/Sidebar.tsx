import { useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, FlaskConical, GitCompare, FileBarChart, Heart,
    ArrowRightLeft, Brain, Send,
} from 'lucide-react';
import '../index.css';

const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/scenarios', label: 'Scenario Builder', icon: FlaskConical },
    { path: '/compare', label: 'Strategy Comparator', icon: GitCompare },
    { path: '/transfers', label: 'Transfer Hub', icon: ArrowRightLeft },
    { path: '/ai', label: 'AI Predictor', icon: Brain },
    { path: '/telegram', label: 'Telegram Alerts', icon: Send },
    { path: '/reports', label: 'Reports & Analytics', icon: FileBarChart },
];

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">🔥</div>
                <div>
                    <h1>CrisisForge AI</h1>
                    <span>Resource Allocation</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {NAV_ITEMS.map(item => (
                    <button
                        key={item.path}
                        className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <item.icon className="nav-icon" size={18} />
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 6 }}>
                    <Heart size={12} style={{ color: '#ef4444' }} />
                    <p style={{ fontSize: '0.72rem', color: '#64748b' }}>Built by The Code Alchemist</p>
                </div>
                <p>HackWhack 3.0 • Nagpur</p>
            </div>
        </aside>
    );
}
