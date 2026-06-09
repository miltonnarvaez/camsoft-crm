const { query } = require('./db');

const BASE = () => process.env.EVOLUTION_API_URL || 'http://127.0.0.1:8080';
const KEY = () => process.env.EVOLUTION_API_KEY || '';
const INSTANCE = () => process.env.EVOLUTION_INSTANCE || 'camsoft';

async function evolutionFetch(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
        const res = await fetch(`${BASE()}${path}`, {
            ...options,
            signal: controller.signal,
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
            const msg =
                data?.message ||
                data?.error ||
                data?.response?.message ||
                (typeof data?.response === 'string' ? data.response : null) ||
                (data?.raw ? String(data.raw).slice(0, 200) : null) ||
                res.statusText;
            throw new Error(`Evolution API: ${msg}`);
        }
        return data;
    } catch (err) {
        if (err.name === 'AbortError') {
            throw new Error(`Evolution API no respondió a tiempo en ${BASE()}. ¿Está corriendo? docker compose ps evolution-api`);
        }
        if (err.cause?.code === 'ECONNREFUSED' || String(err.message).includes('fetch failed')) {
            throw new Error(`Evolution API no accesible en ${BASE()}. Ejecuta: docker compose up -d evolution-api && sleep 20`);
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
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

function webhookConfig() {
    const url =
        process.env.CAMSOFT_WEBHOOK_URL ||
        'http://host.docker.internal:3847/webhooks/whatsapp';
    return {
        enabled: true,
        url,
        byEvents: false,
        base64: false,
        events: ['MESSAGES_UPSERT']
    };
}

async function ensureInstanceWebhook() {
    const url = webhookConfig().url;
    const body = {
        webhook: {
            enabled: true,
            url,
            events: ['MESSAGES_UPSERT']
        }
    };
    try {
        await evolutionFetch(`/webhook/set/${INSTANCE()}`, {
            method: 'POST',
            body: JSON.stringify(body)
        });
        console.log('[evolution] webhook instancia:', url);
    } catch (err) {
        console.warn('[evolution] ensureInstanceWebhook:', err.message);
    }
}

async function createInstance() {
    return evolutionFetch('/instance/create', {
        method: 'POST',
        body: JSON.stringify({
            instanceName: INSTANCE(),
            integration: 'WHATSAPP-BAILEYS',
            qrcode: true,
            webhook: webhookConfig()
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

async function getConnectionState() {
    try {
        const instances = await fetchInstances();
        const name = INSTANCE();
        const row = instances.find((r) => {
            const n = r?.name || r?.instance?.instanceName || r?.instanceName;
            return n === name;
        });
        if (row) {
            const st = row?.connectionStatus?.state || row?.instance?.state || row?.state;
            if (st) return st;
        }
        const data = await evolutionFetch(`/instance/connectionState/${INSTANCE()}`, { method: 'GET' });
        return data?.instance?.state || data?.instance?.status || data?.state || 'close';
    } catch {
        return 'close';
    }
}

function isConnectedState(state) {
    return state === 'open' || state === 'connected';
}

async function getQrCode(forceRecreate = false) {
    const current = await getConnectionState();
    if (isConnectedState(current) && !forceRecreate) {
        return { base64: null, pairingCode: null, state: 'open', alreadyConnected: true };
    }

    let data = await ensureInstance(forceRecreate);
    let qr = parseQrPayload(data);
    if (!qr.base64 && !isConnectedState(qr.state)) {
        data = await connectInstance();
        qr = parseQrPayload(data);
    }
    if (isConnectedState(qr.state)) {
        return { base64: null, pairingCode: null, state: 'open', alreadyConnected: true };
    }
    if (!qr.base64 && forceRecreate) {
        await restartInstance();
        data = await connectInstance();
        qr = parseQrPayload(data);
    }
    if (!qr.base64) {
        throw new Error(
            'Evolution no devolvió QR. Usa https://crm.camsoft.com.co/qr-whatsapp.html o Regenerar QR.'
        );
    }
    return qr;
}

function extractPhoneFromJid(remoteJid) {
    if (!remoteJid) return null;
    const raw = String(remoteJid);
    if (raw.includes('@lid')) return null;
    const digits = raw.split('@')[0].replace(/\D/g, '');
    return digits.length >= 8 ? digits : null;
}

function isPlausiblePhone(digits) {
    const d = String(digits || '');
    // Teléfonos reales: 10–13 dígitos (con código país). Los @lid suelen ser 14+ dígitos.
    return d.length >= 10 && d.length <= 13;
}

function normalizePhoneDigits(phone) {
    if (!phone) return null;
    let d = String(phone).replace(/\D/g, '');
    if (!d) return null;
    if (d.length === 10 && d.startsWith('3')) d = `57${d}`;
    return isPlausiblePhone(d) ? d : null;
}

function normalizeExternalId(externalId, phone) {
    if (externalId && String(externalId).includes('@')) return String(externalId);
    const digits = normalizePhoneDigits(phone || externalId);
    if (digits) return `${digits}@s.whatsapp.net`;
    return externalId ? String(externalId) : null;
}

/** WhatsApp nuevo usa @lid; el teléfono real viene en senderPn / cleanedSenderPn. */
function resolveWhatsappDestination(key = {}, payload = {}) {
    const remoteJid = key.remoteJid || key.remoteJidAlt || payload.sender || null;
    const phone = normalizePhoneDigits(
        key.cleanedSenderPn ||
        extractPhoneFromJid(key.senderPn) ||
        extractPhoneFromJid(key.participant) ||
        extractPhoneFromJid(key.remoteJidAlt) ||
        (remoteJid && !String(remoteJid).includes('@lid') ? extractPhoneFromJid(remoteJid) : null) ||
        extractPhoneFromJid(payload.sender)
    );

    const sendJid =
        key.senderPn ||
        (remoteJid && String(remoteJid).includes('@lid') ? remoteJid : null) ||
        key.remoteJidAlt ||
        (remoteJid && !String(remoteJid).includes('@lid') ? remoteJid : null) ||
        (phone ? `${phone}@s.whatsapp.net` : null);

    return {
        phone,
        jid: sendJid,
        remoteJid: remoteJid || sendJid || null
    };
}

function buildSendTargets(phone, jid, remoteJid) {
    const targets = [];
    for (const j of [jid, remoteJid]) {
        if (j && String(j).includes('@')) targets.push(String(j));
    }
    const digits = normalizePhoneDigits(phone);
    if (digits) {
        targets.push(digits);
        targets.push(`${digits}@s.whatsapp.net`);
    }
    return [...new Set(targets.filter(Boolean))];
}

async function sendText(phone, text, jid = null, remoteJid = null) {
    if (!text?.trim()) throw new Error('Mensaje vacío');

    const state = await getConnectionState();
    if (!isConnectedState(state)) {
        throw new Error(`WhatsApp desconectado (estado: ${state}). Reconecta en CRM → pestaña WA.`);
    }

    const targets = buildSendTargets(phone, jid, remoteJid);
    if (!targets.length) throw new Error('Sin número o JID de destino para WhatsApp');

    let lastErr;
    for (const number of targets) {
        try {
            const result = await evolutionFetch(`/message/sendText/${INSTANCE()}`, {
                method: 'POST',
                body: JSON.stringify({ number, text, delay: 500 })
            });
            console.log('[whatsapp] enviado a', number);
            return result;
        } catch (err) {
            lastErr = err;
            console.warn('[whatsapp] sendText falló para', number, '—', err.message);
        }
    }
    throw lastErr || new Error('No se pudo enviar el mensaje por WhatsApp');
}

async function findOrCreateWhatsappContact(phone, name, externalId = null) {
    const normalizedPhone = normalizePhoneDigits(phone);
    const ext = normalizeExternalId(externalId, normalizedPhone);

    let existing = null;
    if (normalizedPhone) {
        const { rows } = await query(
            `SELECT id FROM contacts WHERE source = 'whatsapp' AND phone = $1`,
            [normalizedPhone]
        );
        existing = rows[0];
    }
    if (!existing && ext) {
        const { rows } = await query(
            `SELECT id FROM contacts WHERE source = 'whatsapp' AND external_id = $1`,
            [ext]
        );
        existing = rows[0];
    }

    if (existing) {
        await query(
            `UPDATE contacts SET
                name = COALESCE(NULLIF($2, ''), name),
                phone = CASE WHEN $3 IS NOT NULL THEN $3
                        WHEN $4 LIKE '%@lid' THEN NULL
                        ELSE phone END,
                external_id = COALESCE(NULLIF($4, ''), external_id),
                updated_at = NOW()
             WHERE id = $1`,
            [existing.id, name || '', normalizedPhone, ext]
        );
        return existing.id;
    }

    const { rows } = await query(
        `INSERT INTO contacts (name, phone, source, external_id)
         VALUES ($1, $2, 'whatsapp', $3) RETURNING id`,
        [name || (normalizedPhone ? `WhatsApp ${normalizedPhone}` : 'WhatsApp'), normalizedPhone, ext]
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
    ensureInstanceWebhook,
    getQrCode,
    getConnectionState,
    sendText,
    extractPhoneFromJid,
    resolveWhatsappDestination,
    findOrCreateWhatsappContact,
    findOrCreateWhatsappConversation
};
