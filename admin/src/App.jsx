import React, { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || 'https://api.camsoft.com.co';

function useAuth() {
    const [token, setToken] = useState(() => localStorage.getItem('camsoft_crm_token'));
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem('camsoft_crm_user') || 'null'); } catch { return null; }
    });

    const save = (data) => {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('camsoft_crm_token', data.token);
        localStorage.setItem('camsoft_crm_user', JSON.stringify(data.user));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('camsoft_crm_token');
        localStorage.removeItem('camsoft_crm_user');
    };

    return { token, user, save, logout };
}

async function api(path, token, options = {}) {
    const res = await fetch(API + path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
}

function Login({ onLogin }) {
    const [email, setEmail] = useState('admin@camsoft.com.co');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    async function submit(e) {
        e.preventDefault();
        setError('');
        try {
            const data = await api('/auth/login', null, {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            onLogin(data);
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <form className="login" onSubmit={submit}>
            <h1>CamSoft CRM</h1>
            <p className="muted">Chat web + WhatsApp en un solo panel</p>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" type="password" required />
            {error && <p style={{ color: '#f87171' }}>{error}</p>}
            <button type="submit">Entrar</button>
        </form>
    );
}

function WhatsAppPanel({ token }) {
    const [status, setStatus] = useState(null);
    const [qr, setQr] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const s = await api('/crm/whatsapp/status', token);
            setStatus(s);
            if (s.connected) setQr(null);
        } catch (err) {
            setError(err.message);
        }
    }, [token]);

    const loadQr = useCallback(async (recreate = false) => {
        setError('');
        setLoading(true);
        try {
            const q = recreate ? '?recreate=1' : '';
            const data = await api(`/crm/whatsapp/qr${q}`, token);
            setQr(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 8000);
        return () => clearInterval(t);
    }, [refresh]);

    useEffect(() => {
        if (status && !status.connected) {
            loadQr(false);
        }
    }, [status, loadQr]);

    return (
        <div style={{ padding: 16 }}>
            <h2>WhatsApp (Evolution API)</h2>
            <p className="muted">Escanea el QR con WhatsApp en el teléfono del negocio. Usa un número dedicado a CamSoft.</p>
            <p>Estado: <strong>{status?.connected ? 'Conectado' : (status?.state || 'desconectado')}</strong></p>
            {!status?.connected && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => loadQr(false)} disabled={loading}>
                        {loading ? 'Generando QR…' : 'Mostrar código QR'}
                    </button>
                    <button type="button" className="secondary" onClick={() => loadQr(true)} disabled={loading}>
                        Regenerar QR
                    </button>
                </div>
            )}
            {qr?.base64 && (
                <img className="qr" src={qr.base64.startsWith('data:') ? qr.base64 : `data:image/png;base64,${qr.base64}`} alt="QR WhatsApp" />
            )}
            {qr?.pairingCode && <p>Código emparejamiento: <strong>{qr.pairingCode}</strong></p>}
            {error && <p style={{ color: '#f87171' }}>{error}</p>}
            <p className="muted" style={{ marginTop: 16 }}>
                El QR expira en ~60 s. Si no escaneas a tiempo, pulsa Regenerar QR.
            </p>
            <p className="muted">
                Alternativa: abre <a href="https://wa.camsoft.com.co/manager" target="_blank" rel="noreferrer">wa.camsoft.com.co/manager</a> e ingresa la API Key de Evolution (.env).
            </p>
        </div>
    );
}

function CrmApp({ token, user, logout }) {
    const [tab, setTab] = useState('inbox');
    const [conversations, setConversations] = useState([]);
    const [selected, setSelected] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState('');
    const [leads, setLeads] = useState([]);

    const loadConversations = useCallback(async () => {
        const data = await api('/crm/conversations', token);
        setConversations(data);
    }, [token]);

    const loadLeads = useCallback(async () => {
        const data = await api('/crm/leads', token);
        setLeads(data);
    }, [token]);

    const loadMessages = useCallback(async (id) => {
        const data = await api(`/crm/conversations/${id}/messages`, token);
        setMessages(data);
    }, [token]);

    useEffect(() => {
        loadConversations();
        loadLeads();
        const socket = io(API, { transports: ['websocket', 'polling'] });
        socket.emit('join:agent', token);
        socket.on('message:new', (payload) => {
            loadConversations();
            if (selected && payload.conversationId === selected.id) {
                loadMessages(selected.id);
            }
        });
        const poll = setInterval(loadConversations, 15000);
        return () => { socket.disconnect(); clearInterval(poll); };
    }, [token, selected, loadConversations, loadLeads, loadMessages]);

    useEffect(() => {
        if (selected) loadMessages(selected.id);
    }, [selected, loadMessages]);

    async function sendReply(e) {
        e.preventDefault();
        if (!reply.trim() || !selected) return;
        await api(`/crm/conversations/${selected.id}/reply`, token, {
            method: 'POST',
            body: JSON.stringify({ body: reply.trim() })
        });
        setReply('');
        loadMessages(selected.id);
    }

    async function closeConv() {
        if (!selected) return;
        await api(`/crm/conversations/${selected.id}`, token, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'closed' })
        });
        loadConversations();
    }

    return (
        <div className="app">
            <aside className="sidebar">
                <div style={{ marginBottom: 16 }}>
                    <strong>{user?.name}</strong>
                    <div className="muted">{user?.email}</div>
                    <button type="button" className="secondary" style={{ marginTop: 8, width: '100%' }} onClick={logout}>Salir</button>
                </div>
                <div className="tabs">
                    <button type="button" className={tab === 'inbox' ? '' : 'secondary'} onClick={() => setTab('inbox')}>Inbox</button>
                    <button type="button" className={tab === 'leads' ? '' : 'secondary'} onClick={() => setTab('leads')}>Leads</button>
                    <button type="button" className={tab === 'wa' ? '' : 'secondary'} onClick={() => setTab('wa')}>WA</button>
                </div>
                {tab === 'inbox' && conversations.map((c) => (
                    <div
                        key={c.id}
                        className={`conv-item ${selected?.id === c.id ? 'active' : ''}`}
                        onClick={() => setSelected(c)}
                    >
                        <div>
                            {c.name || c.phone || 'Sin nombre'}
                            <span className={`badge ${c.channel === 'whatsapp' ? 'wa' : ''}`}>{c.channel}</span>
                        </div>
                        <div className="muted">{c.stage} · {c.status}</div>
                    </div>
                ))}
                {tab === 'leads' && (
                    <div>
                        {leads.map((l) => (
                            <div key={l.id} className="conv-item">
                                <div>{l.name || l.phone}</div>
                                <div className="muted">{l.stage} · score {l.score}</div>
                            </div>
                        ))}
                    </div>
                )}
            </aside>
            <section className="main">
                {tab === 'wa' ? (
                    <WhatsAppPanel token={token} />
                ) : tab === 'leads' ? (
                    <div style={{ padding: 16 }}>
                        <h2>Leads</h2>
                        <p className="muted">Vista rápida. Detalle completo en próxima iteración.</p>
                    </div>
                ) : selected ? (
                    <>
                        <div className="header">
                            <div>
                                <strong>{selected.name || selected.phone}</strong>
                                {selected.email && <span className="muted"> · {selected.email}</span>}
                            </div>
                            <button type="button" className="secondary" onClick={closeConv}>Cerrar conversación</button>
                        </div>
                        <div className="messages">
                            {messages.map((m) => (
                                <div key={m.id} className={`msg ${m.author_type}`}>{m.body}</div>
                            ))}
                        </div>
                        <form className="compose" onSubmit={sendReply}>
                            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Responder…" />
                            <button type="submit">Enviar</button>
                        </form>
                    </>
                ) : (
                    <div style={{ padding: 24 }} className="muted">Selecciona una conversación</div>
                )}
            </section>
        </div>
    );
}

export default function App() {
    const { token, user, save, logout } = useAuth();
    if (!token) return <Login onLogin={save} />;
    return <CrmApp token={token} user={user} logout={logout} />;
}
