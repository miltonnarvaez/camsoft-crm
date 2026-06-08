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
    const text = await res.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch (_) {
        data = { raw: text };
    }
    if (!res.ok) {
        const msg = data?.message || data?.error || data?.response?.message || res.statusText;
        throw new Error(`Evolution API: ${msg}`);
    }
    return data;
}

function parseQrPayload(data) {
    if (!data) {
        return { base64: null, pairingCode: null, state: 'unknown' };
    }
    if (Array.isArray(data) && data[0]) {
        return {
            base64: data[0].base64 || null,
            pairingCode: data[0].pairingCode || null,
            state: 'connecting'
        };
    }
    const nested = data.qrcode;
    if (Array.isArray(nested) && nested[0]) {
        return {
            base64: nested[0].base64 || null,
            pairingCode: nested[0].pairingCode || null,
            state: data.instance?.status || data.instance?.state || 'connecting'
        };
    }
    return {
        base64: data.base64 || nested?.base64 || null,
        pairingCode: data.pairingCode || nested?.pairingCode || null,
        state: data.instance?.status || data.instance?.state || data.state || 'connecting'
    };
}

async function fetchInstances() {
    try {
        const data = await evolutionFetch('/instance/fetchInstances', { method: 'GET' });
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.instances)) return data.instances;
        return [];
    } catch {
        return [];
    }
}

function instanceExists(instances) {
    const name = INSTANCE();
    return instances.some((row) => {
        const n = row?.name || row?.instance?.instanceName || row?.instanceName;
        return n === name;
    });
}

async function deleteInstance() {
    try {
        await evolutionFetch(`/instance/delete/${INSTANCE()}`, { method: 'DELETE' });
    } catch (_) {
        try {
            await evolutionFetch(`/instance/logout/${INSTANCE()}`, { method: 'DELETE' });
        } catch (_e) {}
    }
    await new Promise((r) => setTimeout(r, 1500));
}

async function createInstance() {
    return evolutionFetch('/instance/create', {
        method: 'POST',
        body: JSON.stringify({
            instanceName: INSTANCE(),
            integration: 'WHATSAPP-BAILEYS',
            qrcode: true
        })
    });
}

async function connectInstance() {
    return evolutionFetch(`/instance/connect/${INSTANCE()}`, { method: 'GET' });
}

async function restartInstance() {
    try {
        await evolutionFetch(`/instance/restart/${INSTANCE()}`, { method: 'POST' });
        await new Promise((r) => setTimeout(r, 2500));
    } catch (_) {}
}

async function ensureInstance(forceRecreate = false) {
    if (forceRecreate) {
        await deleteInstance();
    }
    const instances = await fetchInstances();
    if (!instanceExists(instances)) {
        return createInstance();
    }
    return connectInstance();
}

async function getQrCode(forceRecreate = false) {
    let data = await ensureInstance(forceRecreate);
    let qr = parseQrPayload(data);
    if (!qr.base64) {
        data = await connectInstance();
        qr = parseQrPayload(data);
    }
    if (!qr.base64 && qr.state !== 'open') {
        await restartInstance();
        data = await connectInstance();
        qr = parseQrPayload(data);
    }
    if (!qr.base64) {
        throw new Error(
            'Evolution no devolvió QR. Revisa: docker compose logs evolution-api --tail 30'
        );
    }
    return qr;
}

async function getConnectionState() {
    try {
        const data = await evolutionFetch(`/instance/connectionState/${INSTANCE()}`, { method: 'GET' });
        return data?.instance?.state || data?.instance?.status || data?.state || 'close';
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
