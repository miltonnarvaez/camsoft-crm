const { query } = require('./db');
const { normalizePhoneDigits } = require('./evolution');

/** Locks en memoria para carreras entre dos webhooks simultáneos. */
const inflight = new Set();

function dedupeKeys(waMsgId, phone, text) {
    const digits = normalizePhoneDigits(phone);
    const body = String(text || '').trim().toLowerCase().slice(0, 160);
    const keys = [];
    if (waMsgId) keys.push(`id:${waMsgId}`);
    if (digits && body) keys.push(`fp:${digits}:${body}`);
    return keys;
}

async function isMessageProcessed(waMsgId) {
    if (!waMsgId) return false;
    const { rows } = await query(
        `SELECT 1 FROM messages WHERE metadata->>'waMsgId' = $1 LIMIT 1`,
        [waMsgId]
    );
    return rows.length > 0;
}

/** Mismo texto del mismo número en ventana corta (IDs distintos @lid / @s.whatsapp.net). */
async function isRecentDuplicateByContent(phone, text) {
    const digits = normalizePhoneDigits(phone);
    const body = String(text || '').trim().toLowerCase();
    if (!digits || !body) return false;
    const { rows } = await query(
        `SELECT 1 FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         JOIN contacts ct ON ct.id = c.contact_id
         WHERE ct.source = 'whatsapp'
           AND ct.phone = $1
           AND m.author_type = 'visitor'
           AND lower(trim(m.body)) = $2
           AND m.created_at > NOW() - INTERVAL '45 seconds'
         LIMIT 1`,
        [digits, body]
    );
    return rows.length > 0;
}

/** Evolution a veces manda el mismo mensaje en @lid y en @s.whatsapp.net. */
function isLidDuplicateEvent(item) {
    const jid = String(item.key?.remoteJid || item.remoteJid || '');
    if (!jid.includes('@lid')) return false;
    const alt = item.remoteJidAlt || item.key?.remoteJidAlt;
    if (alt && !String(alt).includes('@lid')) return true;
    const pn = item.key?.cleanedSenderPn || item.key?.senderPn;
    if (pn && String(pn).includes('@s.whatsapp.net')) return true;
    if (normalizePhoneDigits(pn)) return true;
    return false;
}

async function acquireInboundLock(waMsgId, phone, text) {
    const keys = dedupeKeys(waMsgId, phone, text);
    if (!keys.length) return true;
    for (const k of keys) {
        if (inflight.has(k)) return false;
    }
    for (const k of keys) {
        inflight.add(k);
    }
    try {
        if (waMsgId && (await isMessageProcessed(waMsgId))) return false;
        if (await isRecentDuplicateByContent(phone, text)) return false;
        return true;
    } catch (err) {
        releaseInboundLock(waMsgId, phone, text);
        throw err;
    }
}

function releaseInboundLock(waMsgId, phone, text) {
    for (const k of dedupeKeys(waMsgId, phone, text)) {
        inflight.delete(k);
    }
}

module.exports = {
    acquireInboundLock,
    releaseInboundLock,
    isMessageProcessed,
    isLidDuplicateEvent
};
