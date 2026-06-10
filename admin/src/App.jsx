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
            if (s.connected) {
                setQr(null);
                setError('');
            }
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
            if (data.alreadyConnected) {
                setQr(null);
                setStatus({ connected: true, state: 'open' });
            } else {
                setQr(data);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        refresh();
        const t = setInterval(refresh, 10000);
        return () => clearInterval(t);
    }, [refresh]);

    const connected = status?.connected;

    return (
        <div style={{ padding: 16 }}>
            <h2>WhatsApp (Evolution API)</h2>
            {connected ? (
                <>
                    <p style={{ color: '#4ade80', fontWeight: 600 }}>WhatsApp conectado correctamente.</p>
                    <p className="muted">Los mensajes entrantes aparecerán en la pestaña Inbox.</p>
                    <button type="button" className="secondary" onClick={refresh}>Actualizar estado</button>
                </>
            ) : (
                <>
                    <p className="muted">Escanea el QR con WhatsApp en el teléfono del negocio.</p>
                    <p>Estado: <strong>{status?.state || 'desconectado'}</strong></p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => loadQr(false)} disabled={loading}>
                            {loading ? 'Generando QR…' : 'Mostrar código QR'}
                        </button>
                        <button type="button" className="secondary" onClick={() => loadQr(true)} disabled={loading}>
                            Regenerar QR
                        </button>
                        <a className="btn secondary" href="/qr-whatsapp.html" target="_blank" rel="noreferrer" style={{ padding: '10px 14px', textDecoration: 'none', borderRadius: 8 }}>
                            Abrir QR en página
                        </a>
                    </div>
                    {qr?.base64 && (
                        <img className="qr" src={qr.base64.startsWith('data:') ? qr.base64 : `data:image/png;base64,${qr.base64}`} alt="QR WhatsApp" />
                    )}
                    {qr?.pairingCode && <p>Código emparejamiento: <strong>{qr.pairingCode}</strong></p>}
                </>
            )}
            {error && <p style={{ color: '#f87171' }}>{error}</p>}
        </div>
    );
}

function BotPanel({ token }) {
    const [faqs, setFaqs] = useState([]);
    const [filter, setFilter] = useState('all');
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(null);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState('');

    const load = useCallback(async () => {
        const q = filter === 'all' ? '?all=1' : `?type=${filter}&all=1`;
        const data = await api(`/crm/bot/faqs${q}`, token);
        setFaqs(data);
    }, [token, filter]);

    useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

    function startNew() {
        setSelected(null);
        setForm({
            question: '',
            answer: '',
            faq_type: 'keyword',
            sector: '',
            keywords: '',
            sort_order: 50,
            active: true
        });
        setSaved('');
    }

    function startEdit(f) {
        setSelected(f);
        setForm({
            question: f.question,
            answer: f.answer,
            faq_type: f.faq_type,
            sector: f.sector || '',
            keywords: f.keywords || '',
            sort_order: f.sort_order,
            active: f.active
        });
        setSaved('');
    }

    async function save(e) {
        e.preventDefault();
        setError('');
        setSaved('');
        const body = {
            ...form,
            sector: form.sector || null
        };
        try {
            if (selected) {
                await api(`/crm/bot/faqs/${selected.id}`, token, {
                    method: 'PATCH',
                    body: JSON.stringify(body)
                });
            } else {
                await api('/crm/bot/faqs', token, {
                    method: 'POST',
                    body: JSON.stringify(body)
                });
            }
            setSaved('Guardado correctamente');
            setForm(null);
            setSelected(null);
            load();
        } catch (err) {
            setError(err.message);
        }
    }

    async function deactivate(id) {
        if (!confirm('¿Desactivar esta respuesta del bot?')) return;
        await api(`/crm/bot/faqs/${id}`, token, { method: 'DELETE' });
        load();
        setForm(null);
    }

    const typeLabel = { menu: 'Menú', keyword: 'Palabra clave', fallback: 'Fallback' };
    const sectorLabel = { public: 'Público', health: 'Salud', education: 'Educación' };

    return (
        <div className="bot-panel">
            <div className="bot-header">
                <div>
                    <h2>Contenido del bot</h2>
                    <p className="muted">Edita saludos, sectores y palabras clave. Los cambios aplican al instante en WhatsApp y chat web.</p>
                </div>
                <button type="button" onClick={startNew}>+ Nueva respuesta</button>
            </div>

            <div className="bot-filters">
                {['all', 'menu', 'keyword', 'fallback'].map((f) => (
                    <button
                        key={f}
                        type="button"
                        className={filter === f ? '' : 'secondary'}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? 'Todas' : typeLabel[f]}
                    </button>
                ))}
            </div>

            {error && <p className="bot-error">{error}</p>}
            {saved && <p className="bot-ok">{saved}</p>}

            <div className="bot-grid">
                <div className="bot-list">
                    {faqs.map((f) => (
                        <div
                            key={f.id}
                            className={`conv-item ${selected?.id === f.id ? 'active' : ''}`}
                            onClick={() => startEdit(f)}
                        >
                            <div>
                                <strong>{f.question}</strong>
                                <span className="badge">{typeLabel[f.faq_type] || f.faq_type}</span>
                                {f.sector && <span className="badge wa">{sectorLabel[f.sector]}</span>}
                            </div>
                            <div className="muted">{f.trigger_key} · orden {f.sort_order}</div>
                        </div>
                    ))}
                </div>

                {form ? (
                    <form className="bot-form" onSubmit={save}>
                        <h3>{selected ? 'Editar respuesta' : 'Nueva respuesta'}</h3>
                        <label>Título interno</label>
                        <input
                            value={form.question}
                            onChange={(e) => setForm({ ...form, question: e.target.value })}
                            required
                        />
                        <label>Tipo</label>
                        <select
                            value={form.faq_type}
                            onChange={(e) => setForm({ ...form, faq_type: e.target.value })}
                        >
                            <option value="menu">Menú principal</option>
                            <option value="keyword">Palabra clave</option>
                            <option value="fallback">Fallback (no entiende)</option>
                        </select>
                        <label>Sector (opcional)</label>
                        <select
                            value={form.sector}
                            onChange={(e) => setForm({ ...form, sector: e.target.value })}
                        >
                            <option value="">Global (todos)</option>
                            <option value="public">Sector público</option>
                            <option value="health">Sector salud</option>
                            <option value="education">Sector educación</option>
                        </select>
                        <label>Palabras clave (separadas por coma)</label>
                        <input
                            value={form.keywords}
                            onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                            placeholder="lms, moodle, plataforma, aula virtual"
                        />
                        <label>Texto que responde el bot</label>
                        <textarea
                            rows={12}
                            value={form.answer}
                            onChange={(e) => setForm({ ...form, answer: e.target.value })}
                            required
                        />
                        <label>Orden</label>
                        <input
                            type="number"
                            value={form.sort_order}
                            onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                        />
                        <div className="bot-actions">
                            <button type="submit">Guardar</button>
                            <button type="button" className="secondary" onClick={() => setForm(null)}>Cancelar</button>
                            {selected && (
                                <button type="button" className="secondary" onClick={() => deactivate(selected.id)}>
                                    Desactivar
                                </button>
                            )}
                        </div>
                    </form>
                ) : (
                    <div className="bot-help muted">
                        <h3>Cómo funciona</h3>
                        <p><strong>Menú:</strong> respuestas al saludo y opciones principales (Sector público, salud…).</p>
                        <p><strong>Palabra clave:</strong> si el cliente escribe LMS, cotización, PQRSD, etc.</p>
                        <p><strong>Flujo inicial:</strong> el saludo (<code>greeting</code>) pregunta Soporte (1) o Ventas (2). Las claves <code>soporte</code> y <code>ventas</code> controlan esa rama.</p>
                        <p><strong>Sector:</strong> las palabras clave con sector solo aplican si el cliente ya eligió ese sector.</p>
                        <p><strong>Fallback:</strong> mensaje cuando el bot no entiende nada.</p>
                        <p>Selecciona una respuesta de la lista o crea una nueva.</p>
                    </div>
                )}
            </div>
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
                    <button type="button" className={tab === 'bot' ? '' : 'secondary'} onClick={() => setTab('bot')}>Bot</button>
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
                ) : tab === 'bot' ? (
                    <BotPanel token={token} />
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
