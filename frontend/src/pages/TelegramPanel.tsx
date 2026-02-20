import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, Bell, RefreshCw, AlertTriangle, Ambulance, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export default function TelegramPanel() {
    const [botToken, setBotToken] = useState('');
    const [chatId, setChatId] = useState('');
    const [messageType, setMessageType] = useState('alerts');
    const [customMessage, setCustomMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [preview, setPreview] = useState('');
    const [status, setStatus] = useState<Record<string, unknown> | null>(null);
    const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

    useEffect(() => {
        api.telegramStatus().then(setStatus).catch(() => { });
        loadPreview('alerts');
    }, []);

    const loadPreview = async (type: string) => {
        try {
            const res = await api.telegramPreview(type);
            setPreview(res.preview);
        } catch (err) { setPreview('Failed to load preview'); }
    };

    const handleTypeChange = (type: string) => {
        setMessageType(type);
        loadPreview(type);
    };

    const sendMessage = async () => {
        if (!botToken || !chatId) {
            setResult({ success: false, message: 'Please enter Bot Token and Chat ID' });
            return;
        }
        setSending(true);
        setResult(null);
        try {
            const res = await api.telegramSend({
                bot_token: botToken,
                chat_id: chatId,
                message_type: messageType,
                custom_message: customMessage,
            });
            const apiResult = res.result as Record<string, unknown>;
            setResult({ success: !!apiResult.success, message: apiResult.success ? 'Message sent! ✅' : String(apiResult.error || 'Send failed') });
        } catch (err: any) {
            setResult({ success: false, message: err.message || 'Failed to send' });
        }
        setSending(false);
    };

    return (
        <div>
            <motion.div className="page-header" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h2>📱 Telegram Alerts</h2>
                <p>Configure autonomous crisis notifications via Telegram</p>
            </motion.div>

            <div className="charts-grid">
                {/* Configuration */}
                <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h3 style={{ marginBottom: 16 }}><Bot size={18} style={{ color: '#06b6d4' }} /> Bot Configuration</h3>

                    {/* Setup Instructions */}
                    <div style={{ padding: '12px 16px', background: 'rgba(6,182,212,0.05)', borderRadius: 8, marginBottom: 16, borderLeft: '3px solid #06b6d4' }}>
                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: 8 }}>Quick Setup:</p>
                        <ol style={{ fontSize: '0.78rem', color: '#64748b', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <li>Message <strong style={{ color: '#06b6d4' }}>@BotFather</strong> on Telegram → /newbot</li>
                            <li>Copy the bot token below</li>
                            <li>Message <strong style={{ color: '#06b6d4' }}>@userinfobot</strong> → get your Chat ID</li>
                            <li>Paste Chat ID below</li>
                        </ol>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="slider-group">
                            <label className="slider-label">Bot Token</label>
                            <input
                                type="password"
                                placeholder="123456789:ABCdefGHI..."
                                value={botToken}
                                onChange={e => setBotToken(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 14px', background: 'rgba(148,163,184,0.06)',
                                    border: '1px solid rgba(148,163,184,0.15)', borderRadius: 8,
                                    color: '#f1f5f9', fontSize: '0.85rem', outline: 'none',
                                }}
                            />
                        </div>
                        <div className="slider-group">
                            <label className="slider-label">Chat ID</label>
                            <input
                                type="text"
                                placeholder="123456789"
                                value={chatId}
                                onChange={e => setChatId(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 14px', background: 'rgba(148,163,184,0.06)',
                                    border: '1px solid rgba(148,163,184,0.15)', borderRadius: 8,
                                    color: '#f1f5f9', fontSize: '0.85rem', outline: 'none',
                                }}
                            />
                        </div>
                    </div>

                    {/* Message Type */}
                    <h4 style={{ margin: '16px 0 8px', fontSize: '0.85rem', color: '#94a3b8' }}>Message Type</h4>
                    <div className="tab-group" style={{ width: '100%' }}>
                        <button className={`tab-btn ${messageType === 'alerts' ? 'active' : ''}`} onClick={() => handleTypeChange('alerts')}>
                            <Bell size={14} /> Alerts
                        </button>
                        <button className={`tab-btn ${messageType === 'transfers' ? 'active' : ''}`} onClick={() => handleTypeChange('transfers')}>
                            <Ambulance size={14} /> Transfers
                        </button>
                        <button className={`tab-btn ${messageType === 'custom' ? 'active' : ''}`} onClick={() => handleTypeChange('custom')}>
                            <Send size={14} /> Custom
                        </button>
                    </div>

                    {messageType === 'custom' && (
                        <textarea
                            placeholder="Enter your custom message..."
                            value={customMessage}
                            onChange={e => setCustomMessage(e.target.value)}
                            rows={3}
                            style={{
                                width: '100%', padding: '10px 14px', marginTop: 12,
                                background: 'rgba(148,163,184,0.06)',
                                border: '1px solid rgba(148,163,184,0.15)', borderRadius: 8,
                                color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', resize: 'vertical',
                            }}
                        />
                    )}

                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={sendMessage} disabled={sending}>
                        {sending ? <><RefreshCw size={16} /> Sending...</> : <><Send size={16} /> Send Telegram Alert</>}
                    </button>

                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                marginTop: 12, padding: '10px 14px', borderRadius: 8,
                                background: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                border: `1px solid ${result.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                display: 'flex', alignItems: 'center', gap: 8,
                            }}
                        >
                            {result.success ? <CheckCircle2 size={16} style={{ color: '#10b981' }} /> : <AlertTriangle size={16} style={{ color: '#ef4444' }} />}
                            <span style={{ color: result.success ? '#10b981' : '#ef4444', fontSize: '0.85rem' }}>{result.message}</span>
                        </motion.div>
                    )}
                </motion.div>

                {/* Preview */}
                <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <h3 style={{ marginBottom: 16 }}>📝 Message Preview</h3>
                    <pre style={{
                        background: 'rgba(148,163,184,0.04)', padding: 16, borderRadius: 8,
                        fontSize: '0.78rem', color: '#f1f5f9', lineHeight: 1.6,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        border: '1px solid rgba(148,163,184,0.08)',
                        maxHeight: 500, overflowY: 'auto',
                    }}>
                        {preview || 'Loading preview...'}
                    </pre>

                    {/* Alert Thresholds */}
                    <div style={{ marginTop: 16 }}>
                        <h4 style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 8 }}>⚙️ Alert Thresholds</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {[
                                { label: 'Bed Critical', value: '90%', color: '#ef4444' },
                                { label: 'Bed Warning', value: '80%', color: '#f59e0b' },
                                { label: 'ICU Critical', value: '85%', color: '#ef4444' },
                                { label: 'ICU Warning', value: '75%', color: '#f59e0b' },
                                { label: 'Ventilator', value: '85%', color: '#ef4444' },
                                { label: 'Staff', value: '90%', color: '#f59e0b' },
                            ].map((t, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(148,163,184,0.04)', borderRadius: 6 }}>
                                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{t.label}</span>
                                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: t.color }}>{t.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bot Status */}
                    <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(148,163,184,0.04)', borderRadius: 8 }}>
                        <p style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Bot Status: {status ? (status.configured ? '🟢 Configured (env vars)' : '🟡 Not configured — use the form above') : '⚪ Checking...'}
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
