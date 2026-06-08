require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { query } = require('./db');
const { ensureAdminUser, login, authMiddleware } = require('./auth');
const {
    startWebConversation,
    getConversationByToken,
    handleVisitorMessage,
    handleAgentMessage,
    listMessages,
    addMessage
} = require('./chat');
const { processBotMessage } = require('./bot');
const {
    getQrCode,
    getConnectionState,
    extractPhoneFromJid,
    findOrCreateWhatsappContact,
    findOrCreateWhatsappConversation,
    sendText
} = require('./evolution');

const PORT = Number(process.env.PORT || 3847);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://camsoft.com.co';

const app = express();
app.use(cors({ origin: [CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true }));
app.use(express.json({ limit: '1mb' }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: [CORS_ORIGIN, 'http://localhost:5173'], methods: ['GET', 'POST'] }
});

function emitConversation(conversationId, event, payload) {
    io.to(`conv:${conversationId}`).emit(event, payload);
    io.to('agents').emit(event, { conversationId, ...payload });
}

// --- Widget estático ---
app.use('/widget.js', express.static(path.join(__dirname, '../../widget/widget.js')));

// --- Salud ---
app.get('/health', async (_req, res) => {
    try {
        await query('SELECT 1');
        res.json({ ok: true, service: 'camsoft-crm-api' });
    } catch (e) {
        res.status(500).json({ ok: false, error: e.message });
    }
});

// --- Auth ---
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body || {};
    const result = await login(email, password);
    if (!result) return res.status(401).json({ error: 'Credenciales inválidas' });
    res.json(result);
});

// --- Chat web (público) ---
app.post('/chat/start', async (req, res) => {
    try {
        const data = await startWebConversation(req.body || {});
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/chat/:visitorToken/messages', async (req, res) => {
    try {
        const conv = await getConversationByToken(req.params.visitorToken);
        if (!conv) return res.status(404).json({ error: 'No encontrado' });
        const messages = await listMessages(conv.id);
        res.json({ conversation: conv, messages });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/chat/:visitorToken/message', async (req, res) => {
    try {
        const { body } = req.body || {};
        if (!body?.trim()) return res.status(400).json({ error: 'Mensaje vacío' });
        const result = await handleVisitorMessage(req.params.visitorToken, body.trim());
        emitConversation(result.conversation.id, 'message:new', {
            messages: [result.visitorMsg, result.botMsg]
        });
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

// --- Webhook Evolution API (WhatsApp) ---
app.post('/webhooks/whatsapp', async (req, res) => {
    res.sendStatus(200);
    try {
        const payload = req.body || {};
        const event = payload.event || payload.type;
        if (!event || !String(event).toLowerCase().includes('message')) return;

        const data = payload.data || payload;
        const key = data.key || {};
        if (key.fromMe) return;

        const remoteJid = key.remoteJid || data.remoteJid;
        if (!remoteJid || String(remoteJid).includes('@g.us')) return;

        const phone = extractPhoneFromJid(remoteJid);
        const text =
            data.message?.conversation ||
            data.message?.extendedTextMessage?.text ||
            data.message?.buttonsResponseMessage?.selectedDisplayText ||
            data.text ||
            '';
        if (!text.trim()) return;

        const pushName = data.pushName || key.pushName || null;
        const contactId = await findOrCreateWhatsappContact(phone, pushName);
        const conversationId = await findOrCreateWhatsappConversation(contactId);

        const visitorMsg = await addMessage(conversationId, 'visitor', text.trim(), { channel: 'whatsapp' });
        const botResult = await processBotMessage(conversationId, text);
        const botMsg = await addMessage(conversationId, 'bot', botResult.reply);

        emitConversation(conversationId, 'message:new', { messages: [visitorMsg, botMsg] });

        if (process.env.WHATSAPP_BOT_REPLY !== 'false') {
            try {
                await sendText(phone, botResult.reply);
            } catch (err) {
                console.error('[whatsapp] auto-reply error', err.message);
            }
        }
    } catch (err) {
        console.error('[webhook whatsapp]', err.message);
    }
});

// --- CRM (protegido) ---
app.get('/crm/conversations', authMiddleware, async (req, res) => {
    const status = req.query.status;
    const params = [];
    let sql = `
        SELECT c.id, c.channel, c.status, c.last_message_at, c.created_at,
               ct.name, ct.email, ct.phone, ct.source,
               l.stage, l.sector, l.score
        FROM conversations c
        JOIN contacts ct ON ct.id = c.contact_id
        LEFT JOIN leads l ON l.conversation_id = c.id
    `;
    if (status) {
        params.push(status);
        sql += ` WHERE c.status = $1`;
    }
    sql += ` ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC LIMIT 200`;
    const { rows } = await query(sql, params);
    res.json(rows);
});

app.get('/crm/conversations/:id/messages', authMiddleware, async (req, res) => {
    const messages = await listMessages(req.params.id);
    res.json(messages);
});

app.post('/crm/conversations/:id/reply', authMiddleware, async (req, res) => {
    try {
        const { body } = req.body || {};
        if (!body?.trim()) return res.status(400).json({ error: 'Mensaje vacío' });
        const result = await handleAgentMessage(req.params.id, body.trim(), req.user.name || 'Agente');
        emitConversation(req.params.id, 'message:new', { messages: [result.msg] });
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

app.patch('/crm/conversations/:id', authMiddleware, async (req, res) => {
    const { status } = req.body || {};
    if (!['open', 'waiting', 'closed'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }
    const { rows } = await query(
        `UPDATE conversations SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [req.params.id, status]
    );
    res.json(rows[0]);
});

app.get('/crm/leads', authMiddleware, async (_req, res) => {
    const { rows } = await query(
        `SELECT l.*, ct.name, ct.email, ct.phone, ct.source
         FROM leads l JOIN contacts ct ON ct.id = l.contact_id
         ORDER BY l.updated_at DESC LIMIT 200`
    );
    res.json(rows);
});

app.patch('/crm/leads/:id', authMiddleware, async (req, res) => {
    const { stage, notes, sector } = req.body || {};
    const { rows } = await query(
        `UPDATE leads SET
            stage = COALESCE($2, stage),
            notes = COALESCE($3, notes),
            sector = COALESCE($4, sector),
            updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [req.params.id, stage || null, notes ?? null, sector || null]
    );
    res.json(rows[0]);
});

app.get('/crm/whatsapp/status', authMiddleware, async (_req, res) => {
    const state = await getConnectionState();
    res.json({ state, connected: state === 'open' });
});

app.get('/crm/whatsapp/qr', authMiddleware, async (_req, res) => {
    try {
        const qr = await getQrCode();
        res.json(qr);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/crm/whatsapp/send', authMiddleware, async (req, res) => {
    try {
        const { phone, text, conversationId } = req.body || {};
        if (!phone || !text) return res.status(400).json({ error: 'phone y text requeridos' });
        await sendText(phone, text);
        if (conversationId) {
            const msg = await addMessage(conversationId, 'agent', text, { agent: req.user.name, via: 'whatsapp' });
            emitConversation(conversationId, 'message:new', { messages: [msg] });
        }
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- Socket.io ---
io.on('connection', (socket) => {
    socket.on('join:visitor', (visitorToken) => {
        if (!visitorToken) return;
        socket.join(`visitor:${visitorToken}`);
        getConversationByToken(visitorToken).then((conv) => {
            if (conv) socket.join(`conv:${conv.id}`);
        });
    });

    socket.on('join:agent', (token) => {
        if (!token) return;
        try {
            const jwt = require('jsonwebtoken');
            jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-production');
            socket.join('agents');
        } catch (_) {}
    });

    socket.on('join:conversation', (conversationId) => {
        if (conversationId) socket.join(`conv:${conversationId}`);
    });
});

async function boot() {
    await ensureAdminUser();
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[camsoft-crm] API en puerto ${PORT}`);
    });
}

boot().catch((err) => {
    console.error(err);
    process.exit(1);
});
