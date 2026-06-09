const { query } = require('./db');
const { handleWhatsappWebhook } = require('./whatsapp-webhook');

const INSTANCE = () => process.env.EVOLUTION_INSTANCE || 'camsoft';
const INTERVAL_MS = Number(process.env.WHATSAPP_POLLER_MS || 4000);

/** IDs de mensajes WA ya procesados (Evolution key.id) */
async function isMessageProcessed(waMsgId) {
    if (!waMsgId) return true;
    const { rows } = await query(
        `SELECT 1 FROM messages WHERE metadata->>'waMsgId' = $1 LIMIT 1`,
        [waMsgId]
    );
    return rows.length > 0;
}

function buildWebhookPayload(row) {
    const key = typeof row.key === 'string' ? JSON.parse(row.key) : row.key;
    const message = typeof row.message === 'string' ? JSON.parse(row.message) : row.message;
    return {
        event: 'messages.upsert',
        instance: INSTANCE(),
        data: {
            key,
            message,
            pushName: row.pushName || row.push_name || null,
            messageTimestamp: row.messageTimestamp || row.message_timestamp
        }
    };
}

async function pollEvolutionMessages(emitConversation) {
    let rows = [];
    try {
        const result = await query(
            `SELECT m.key, m.message, m."pushName", m."messageTimestamp"
             FROM evolution_api."Message" m
             INNER JOIN evolution_api."Instance" i ON i.id = m."instanceId"
             WHERE i.name = $1
               AND COALESCE(m.key->>'fromMe', 'false') = 'false'
               AND m."messageTimestamp" > (EXTRACT(EPOCH FROM NOW()) - 300)
             ORDER BY m."messageTimestamp" ASC
             LIMIT 20`,
            [INSTANCE()]
        );
        rows = result.rows;
    } catch (err) {
        if (!pollEvolutionMessages._warned) {
            console.warn('[whatsapp-poller] consulta BD:', err.message);
            pollEvolutionMessages._warned = true;
        }
        return;
    }

    for (const row of rows) {
        const key = typeof row.key === 'string' ? JSON.parse(row.key) : row.key;
        const msgId = key?.id;
        if (!msgId || (await isMessageProcessed(msgId))) continue;

        const remoteJid = key?.remoteJid || '';
        if (remoteJid.includes('@g.us')) continue;

        console.log('[whatsapp-poller] mensaje nuevo:', msgId, remoteJid);
        const payload = buildWebhookPayload(row);
        await handleWhatsappWebhook(payload, emitConversation);
    }
}

function startWhatsappPoller(emitConversation) {
    if (process.env.WHATSAPP_POLLER === 'false') return;
    console.log(`[whatsapp-poller] activo cada ${INTERVAL_MS}ms (respaldo si webhook falla)`);
    setInterval(() => {
        pollEvolutionMessages(emitConversation).catch((err) => {
            console.warn('[whatsapp-poller]', err.message);
        });
    }, INTERVAL_MS);
}

module.exports = { startWhatsappPoller, pollEvolutionMessages };
