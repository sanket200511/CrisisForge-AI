import { useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, FlaskConical, GitCompare, FileBarChart, Heart,
    ArrowRightLeft, Brain, Bell, MapPin, LogOut, Sun, Moon, Menu, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useState, useEffect } from 'react';
import '../index.css';

const NAV_ITEMS = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/scenarios', label: 'Scenario Builder', icon: FlaskConical },
    { path: '/compare', label: 'Strategy Comparator', icon: GitCompare },
    { path: '/transfers', label: 'Transfer Hub', icon: ArrowRightLeft },
    { path: '/ai', label: 'AI Predictor', icon: Brain },
    { path: '/telegram', label: 'Notifications', icon: Bell },
    { path: '/map', label: 'Hospital Map', icon: MapPin },
    { path: '/reports', label: 'Reports & Analytics', icon: FileBarChart },
];

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logOut } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // Close sidebar on window resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) setMobileOpen(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
            >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay for mobile */}
            {mobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
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

                <div className="sidebar-footer" style={{ padding: '16px 12px 0', borderTop: '1px solid var(--border-subtle)' }}>
                    {/* Creative Theme Toggle */}
                    <button className="theme-toggle" onClick={toggleTheme}>
                        <span className="toggle-icon">
                            {theme === 'dark' ? <Sun size={18} style={{ color: '#f59e0b' }} /> : <Moon size={18} style={{ color: '#8b5cf6' }} />}
                        </span>
                        {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    </button>

                    {user ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                                <img
                                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=06b6d4&color=fff`}
                                    alt="Profile"
                                    style={{ width: 32, height: 32, borderRadius: '50%' }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: 110 }}>
                                        {user.displayName || 'Health Officer'}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Verified Access</span>
                                </div>
                            </div>
                            <button
                                onClick={() => logOut()}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                                title="Sign Out"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    ) : null}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 6 }}>
                        <Heart size={12} style={{ color: '#ef4444' }} />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Built by The Code Alchemist</p>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>HackWhack 3.0 • Nagpur</p>
                </div>
            </aside>
        </>
    );
}
