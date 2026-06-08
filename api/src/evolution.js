const { query } = require('./db');

const BASE = () => process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
const KEY = () => process.env.EVOLUTION_API_KEY || '';
const INSTANCE = () => process.env.EVOLUTION_INSTANCE || 'camsoft';

async function evolutionFetch(path, options = {}) {
    const res = await fetch(`${BASE()}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            apikey: KEY(),
            ...(options.headers || {})
        }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data?.message || data?.error || res.statusText;
        throw new Error(`Evolution API: ${msg}`);
    }
    return data;
}

async function ensureInstance() {
    try {
        await evolutionFetch(`/instance/connect/${INSTANCE()}`, { method: 'GET' });
    } catch (_) {
        await evolutionFetch('/instance/create', {
            method: 'POST',
            body: JSON.stringify({
                instanceName: INSTANCE(),
                integration: 'WHATSAPP-BAILEYS',
                qrcode: true
            })
        });
    }
}

async function getQrCode() {
    await ensureInstance();
    const data = await evolutionFetch(`/instance/connect/${INSTANCE()}`, { method: 'GET' });
    return {
        base64: data?.base64 || data?.qrcode?.base64 || null,
        pairingCode: data?.pairingCode || null,
        state: data?.instance?.state || data?.state || 'unknown'
    };
}

async function getConnectionState() {
    try {
        const data = await evolutionFetch(`/instance/connectionState/${INSTANCE()}`, { method: 'GET' });
        return data?.instance?.state || data?.state || 'close';
    } catch {
        return 'close';
    }
}

async function sendText(phone, text) {
    const number = phone.replace(/\D/g, '');
    return evolutionFetch(`/message/sendText/${INSTANCE()}`, {
        method: 'POST',
        body: JSON.stringify({
            number,
            text,
            delay: 800
        })
    });
}

function extractPhoneFromJid(remoteJid) {
    if (!remoteJid) return null;
    return remoteJid.split('@')[0].replace(/\D/g, '');
}

async function findOrCreateWhatsappContact(phone, name) {
    const { rows: existing } = await query(
        `SELECT id FROM contacts WHERE source = 'whatsapp' AND phone = $1`,
        [phone]
    );
    if (existing[0]) {
        if (name) {
            await query(
                `UPDATE contacts SET name = COALESCE(NULLIF(name, ''), $2), updated_at = NOW() WHERE id = $1`,
                [existing[0].id, name]
            );
        }
        return existing[0].id;
    }
    const { rows } = await query(
        `INSERT INTO contacts (name, phone, source, external_id)
         VALUES ($1, $2, 'whatsapp', $2) RETURNING id`,
        [name || `WhatsApp ${phone}`, phone]
    );
    return rows[0].id;
}

async function findOrCreateWhatsappConversation(contactId) {
    const { rows: open } = await query(
        `SELECT id FROM conversations
         WHERE contact_id = $1 AND channel = 'whatsapp' AND status != 'closed'
         ORDER BY created_at DESC LIMIT 1`,
        [contactId]
    );
    if (open[0]) return open[0].id;

    const { rows } = await query(
        `INSERT INTO conversations (contact_id, channel, status)
         VALUES ($1, 'whatsapp', 'open') RETURNING id`,
        [contactId]
    );
    await query(
        `INSERT INTO leads (contact_id, conversation_id, stage, score)
         VALUES ($1, $2, 'new', 10)`,
        [contactId, rows[0].id]
    );
    return rows[0].id;
}

module.exports = {
    ensureInstance,
    getQrCode,
    getConnectionState,
    sendText,
    extractPhoneFromJid,
    findOrCreateWhatsappContact,
    findOrCreateWhatsappConversation
};
