import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertTriangle, Eye, EyeOff, Mail, Lock, ArrowLeft, CheckCircle2, Zap, Activity, Globe } from 'lucide-react';

export default function Login() {
    const { signInWithGoogle, signInWithEmail, registerWithEmail, resetPassword } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSent, setResetSent] = useState(false);

    const handleGoogleLogin = async () => {
        try {
            setError('');
            setLoading(true);
            await signInWithGoogle();
            navigate('/', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async () => {
        try {
            setError('');
            setLoading(true);
            if (isRegistering) {
                await registerWithEmail(email, password);
            } else {
                await signInWithEmail(email, password);
            }
            navigate('/', { replace: true });
        } catch (err: any) {
            let msg = err.message || 'Authentication failed';
            if (msg.includes('auth/invalid-credential')) msg = 'Invalid email or password.';
            if (msg.includes('auth/email-already-in-use')) msg = 'Email is already registered.';
            if (msg.includes('auth/weak-password')) msg = 'Password should be at least 6 characters.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        try {
            setError('');
            setLoading(true);
            await resetPassword(resetEmail);
            setResetSent(true);
        } catch (err: any) {
            let msg = err.message || 'Failed to send reset email.';
            if (msg.includes('auth/user-not-found')) msg = 'No account found with this email.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Floating particles for background
    const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 15 + 10,
        delay: Math.random() * 5,
    }));

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', width: '100vw',
            background: 'linear-gradient(135deg, #0a1628 0%, #0f2035 40%, #0a1628 100%)',
            position: 'absolute', top: 0, left: 0, zIndex: 9999, overflow: 'hidden'
        }}>
            {/* Animated floating particles */}
            {particles.map(p => (
                <motion.div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        width: p.size, height: p.size,
                        borderRadius: '50%',
                        background: `rgba(6, 182, 212, ${0.1 + Math.random() * 0.2})`,
                        left: `${p.x}%`, top: `${p.y}%`,
                    }}
                    animate={{
                        y: [0, -30, 0],
                        x: [0, 15, 0],
                        opacity: [0.2, 0.6, 0.2],
                    }}
                    transition={{
                        duration: p.duration,
                        delay: p.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}

            {/* Animated glow orbs */}
            <motion.div
                style={{
                    position: 'absolute', top: '15%', left: '25%', width: 500, height: 500,
                    background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
                    filter: 'blur(60px)', zIndex: 0
                }}
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                style={{
                    position: 'absolute', bottom: '10%', right: '20%', width: 400, height: 400,
                    background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
                    filter: 'blur(60px)', zIndex: 0
                }}
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                style={{
                    position: 'absolute', top: '50%', right: '40%', width: 300, height: 300,
                    background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
                    filter: 'blur(50px)', zIndex: 0
                }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Feature badges floating */}
            <motion.div
                style={{ position: 'absolute', top: '12%', right: '10%', display: 'flex', gap: 8, alignItems: 'center', padding: '8px 16px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 20, zIndex: 1 }}
                initial={{ opacity: 0, x: 50 }} animate={{ opacity: 0.7, x: 0 }} transition={{ delay: 1.5, duration: 1 }}
            >
                <Zap size={14} style={{ color: '#06b6d4' }} />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>ML-Powered Prediction</span>
            </motion.div>
            <motion.div
                style={{ position: 'absolute', bottom: '15%', left: '8%', display: 'flex', gap: 8, alignItems: 'center', padding: '8px 16px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 20, zIndex: 1 }}
                initial={{ opacity: 0, x: -50 }} animate={{ opacity: 0.7, x: 0 }} transition={{ delay: 2, duration: 1 }}
            >
                <Activity size={14} style={{ color: '#8b5cf6' }} />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Real-Time Monitoring</span>
            </motion.div>
            <motion.div
                style={{ position: 'absolute', top: '25%', left: '6%', display: 'flex', gap: 8, alignItems: 'center', padding: '8px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 20, zIndex: 1 }}
                initial={{ opacity: 0, x: -50 }} animate={{ opacity: 0.7, x: 0 }} transition={{ delay: 2.5, duration: 1 }}
            >
                <Globe size={14} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>8 Nagpur Hospitals</span>
            </motion.div>

            {/* Main Login Card */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                style={{
                    background: 'rgba(15,32,53,0.6)',
                    backdropFilter: 'blur(30px)',
                    border: '1px solid rgba(148,163,184,0.1)',
                    borderRadius: 28, padding: '44px 36px',
                    width: '100%', maxWidth: 420,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    boxShadow: '0 30px 60px -15px rgba(0,0,0,0.6), 0 0 40px rgba(6,182,212,0.05)',
                    zIndex: 1, position: 'relative',
                }}
            >
                {/* Animated logo */}
                <motion.div
                    style={{
                        width: 72, height: 72, borderRadius: 20,
                        background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 20, fontSize: '2.2rem',
                        boxShadow: '0 12px 30px -5px rgba(6,182,212,0.4)',
                    }}
                    animate={{ boxShadow: ['0 12px 30px -5px rgba(6,182,212,0.4)', '0 12px 30px -5px rgba(139,92,246,0.4)', '0 12px 30px -5px rgba(6,182,212,0.4)'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                    🔥
                </motion.div>

                <h1 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f1f5f9', marginBottom: 6, textAlign: 'center', letterSpacing: '-0.02em' }}>
                    CrisisForge AI
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 28, textAlign: 'center', lineHeight: 1.6 }}>
                    Secure healthcare resource allocation<br />and predictive intelligence platform.
                </p>

                <AnimatePresence mode="wait">
                    {showForgotPassword ? (
                        /* ─── Forgot Password View ─── */
                        <motion.div
                            key="forgot"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            style={{ width: '100%' }}
                        >
                            {resetSent ? (
                                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: 16 }} />
                                    <h3 style={{ color: '#f1f5f9', fontSize: '1.1rem', marginBottom: 8 }}>Reset Link Sent!</h3>
                                    <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: 20 }}>
                                        Check your inbox at <strong style={{ color: '#06b6d4' }}>{resetEmail}</strong> for a password reset link.
                                    </p>
                                    <button
                                        onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail(''); }}
                                        style={{
                                            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', color: '#fff',
                                            border: 'none', borderRadius: 12, padding: '12px 24px',
                                            fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', width: '100%',
                                        }}
                                    >
                                        Back to Sign In
                                    </button>
                                </motion.div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { setShowForgotPassword(false); setError(''); }}
                                        style={{ background: 'none', border: 'none', color: '#06b6d4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '0.85rem' }}
                                    >
                                        <ArrowLeft size={16} /> Back to Sign In
                                    </button>
                                    <h3 style={{ color: '#f1f5f9', fontSize: '1.05rem', marginBottom: 8 }}>Reset Password</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: 12, lineHeight: 1.5 }}>
                                        Enter your email and we'll send you a secure link to reset your password.
                                    </p>

                                    <div style={{ padding: '8px 12px', background: 'rgba(6,182,212,0.08)', borderRadius: 8, marginBottom: 16, border: '1px solid rgba(6,182,212,0.15)' }}>
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>
                                            <strong style={{ color: '#06b6d4' }}>Note:</strong> For security reasons (Email Enumeration Protection), Firebase will only send an email if a registered account matches the address provided. Please check your spam folder.
                                        </p>
                                    </div>

                                    {error && (
                                        <div style={{ width: '100%', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, marginBottom: 14, display: 'flex', gap: 8 }}>
                                            <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                                            <span style={{ color: '#ef4444', fontSize: '0.82rem' }}>{error}</span>
                                        </div>
                                    )}

                                    <div style={{ position: 'relative', width: '100%', marginBottom: 16 }}>
                                        <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                        <input
                                            type="email"
                                            placeholder="Your email address"
                                            value={resetEmail}
                                            onChange={e => setResetEmail(e.target.value)}
                                            style={{
                                                width: '100%', padding: '14px 16px 14px 42px',
                                                background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)',
                                                borderRadius: 12, color: '#f1f5f9', fontSize: '0.92rem', outline: 'none',
                                            }}
                                            onFocus={e => e.currentTarget.style.borderColor = '#06b6d4'}
                                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
                                        />
                                    </div>
                                    <button
                                        onClick={handlePasswordReset}
                                        disabled={loading || !resetEmail}
                                        style={{
                                            width: '100%', padding: '14px', background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                                            color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700,
                                            cursor: (loading || !resetEmail) ? 'not-allowed' : 'pointer',
                                            opacity: (loading || !resetEmail) ? 0.6 : 1,
                                        }}
                                    >
                                        {loading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                </>
                            )}
                        </motion.div>
                    ) : (
                        /* ─── Main Login View ─── */
                        <motion.div
                            key="login"
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 30 }}
                            style={{ width: '100%' }}
                        >
                            {error && (
                                <div style={{
                                    width: '100%', padding: '12px 16px', background: 'rgba(239,68,68,0.1)',
                                    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, marginBottom: 20,
                                    display: 'flex', alignItems: 'flex-start', gap: 10
                                }}>
                                    <AlertTriangle size={18} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                                    <span style={{ color: '#ef4444', fontSize: '0.85rem', lineHeight: 1.4 }}>{error}</span>
                                </div>
                            )}

                            {/* Email Input with icon */}
                            <div style={{ position: 'relative', width: '100%', marginBottom: 12 }}>
                                <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                <input
                                    type="email"
                                    placeholder="Official Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        width: '100%', padding: '14px 16px 14px 42px',
                                        background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)',
                                        borderRadius: 12, color: '#f1f5f9', fontSize: '0.92rem',
                                        outline: 'none', transition: 'border-color 0.2s'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#06b6d4'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
                                />
                            </div>

                            {/* Password Input with show/hide toggle */}
                            <div style={{ position: 'relative', width: '100%', marginBottom: 8 }}>
                                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        width: '100%', padding: '14px 48px 14px 42px',
                                        background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(148, 163, 184, 0.2)',
                                        borderRadius: 12, color: '#f1f5f9', fontSize: '0.92rem',
                                        outline: 'none', transition: 'border-color 0.2s'
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = '#06b6d4'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                                        color: showPassword ? '#06b6d4' : '#64748b', transition: 'color 0.2s'
                                    }}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Forgot Password Link */}
                            {!isRegistering && (
                                <div style={{ textAlign: 'right', marginBottom: 16 }}>
                                    <button
                                        onClick={() => { setShowForgotPassword(true); setError(''); setResetEmail(email); }}
                                        style={{
                                            background: 'none', border: 'none', color: '#f59e0b',
                                            fontSize: '0.8rem', cursor: 'pointer', opacity: 0.8,
                                        }}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            {isRegistering && <div style={{ height: 8 }} />}

                            <motion.button
                                onClick={handleEmailAuth}
                                disabled={loading || !email || !password}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    width: '100%', padding: '14px 24px', marginBottom: 16,
                                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', color: '#fff',
                                    border: 'none', borderRadius: 12,
                                    fontSize: '0.95rem', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    cursor: (loading || !email || !password) ? 'not-allowed' : 'pointer',
                                    opacity: (loading || !email || !password) ? 0.7 : 1,
                                    boxShadow: '0 6px 20px rgba(6, 182, 212, 0.3)',
                                }}
                            >
                                {loading ? 'Processing...' : isRegistering ? '🚀 Create Account' : '🔐 Sign In with Email'}
                            </motion.button>

                            <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0' }}>
                                <div style={{ flex: 1, height: 1, background: 'rgba(148, 163, 184, 0.15)' }} />
                                <span style={{ padding: '0 14px', fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>OR CONTINUE WITH</span>
                                <div style={{ flex: 1, height: 1, background: 'rgba(148, 163, 184, 0.15)' }} />
                            </div>

                            <motion.button
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                                style={{
                                    width: '100%', padding: '14px 24px',
                                    background: '#f1f5f9', color: '#0f172a',
                                    border: 'none', borderRadius: 12,
                                    fontSize: '0.92rem', fontWeight: 600,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.7 : 1,
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                                }}
                            >
                                <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                                    <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                                        <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                                        <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                                        <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                                        <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                                    </g>
                                </svg>
                                Continue with Google (OAuth 2.0)
                            </motion.button>

                            <div style={{ marginTop: 20, textAlign: 'center' }}>
                                <button
                                    onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                                    style={{
                                        background: 'none', border: 'none', color: '#06b6d4',
                                        fontSize: '0.85rem', cursor: 'pointer',
                                    }}
                                >
                                    {isRegistering ? '← Already have an account? Sign In' : 'Need an account? Register →'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 24 }}
                    initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.8 }}
                >
                    <Shield size={14} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Verified Health Official Access Only</span>
                </motion.div>
            </motion.div>
        </div>
    );
}
