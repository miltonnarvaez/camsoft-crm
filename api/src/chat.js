const { v4: uuidv4 } = require('uuid');
const { query } = require('./db');
const { processBotMessage } = require('./bot');
const { sendText } = require('./evolution');

async function startWebConversation({ name, email, phone }) {
    const visitorToken = uuidv4().replace(/-/g, '');
    const { rows: contactRows } = await query(
        `INSERT INTO contacts (name, email, phone, source)
         VALUES ($1, $2, $3, 'web') RETURNING id`,
        [name || 'Visitante', email || null, phone || null]
    );
    const contactId = contactRows[0].id;
    const { rows: convRows } = await query(
        `INSERT INTO conversations (contact_id, channel, status, visitor_token)
         VALUES ($1, 'web', 'open', $2) RETURNING id`,
        [contactId, visitorToken]
    );
    const conversationId = convRows[0].id;
    await query(
        `INSERT INTO leads (contact_id, conversation_id, stage, score)
         VALUES ($1, $2, 'new', 5)`,
        [contactId, conversationId]
    );
    const greeting = await processBotMessage(conversationId, 'hola');
    const { rows: msgRows } = await query(
        `INSERT INTO messages (conversation_id, author_type, body)
         VALUES ($1, 'bot', $2) RETURNING *`,
        [conversationId, greeting.reply]
    );
    await query(
        `UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [conversationId]
    );
    return { visitorToken, conversationId, message: msgRows[0] };
}

async function getConversationByToken(visitorToken) {
    const { rows } = await query(
        `SELECT c.*, ct.name AS contact_name, ct.email, ct.phone
         FROM conversations c
         JOIN contacts ct ON ct.id = c.contact_id
         WHERE c.visitor_token = $1 AND c.channel = 'web'`,
        [visitorToken]
    );
    return rows[0] || null;
}

async function addMessage(conversationId, authorType, body, metadata = {}) {
    const { rows } = await query(
        `INSERT INTO messages (conversation_id, author_type, body, metadata)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [conversationId, authorType, body, JSON.stringify(metadata)]
    );
    await query(
        `UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [conversationId]
    );
    return rows[0];
}

async function handleVisitorMessage(visitorToken, body) {
    const conv = await getConversationByToken(visitorToken);
    if (!conv) throw new Error('Conversación no encontrada');
    if (conv.status === 'closed') throw new Error('Conversación cerrada');

    const visitorMsg = await addMessage(conv.id, 'visitor', body);
    const botResult = await processBotMessage(conv.id, body);
    const botMsg = await addMessage(conv.id, 'bot', botResult.reply);

    return { conversation: conv, visitorMsg, botMsg, hotLead: botResult.hotLead };
}

async function handleAgentMessage(conversationId, body, agentName) {
    const { rows } = await query(
        `SELECT c.*, ct.phone, ct.external_id, ct.source FROM conversations c
         JOIN contacts ct ON ct.id = c.contact_id WHERE c.id = $1`,
        [conversationId]
    );
    const conv = rows[0];
    if (!conv) throw new Error('Conversación no encontrada');

    const msg = await addMessage(conversationId, 'agent', body, { agent: agentName });
    await query(
        `UPDATE leads SET stage = 'contacted', updated_at = NOW() WHERE conversation_id = $1`,
        [conversationId]
    );

    if (conv.channel === 'whatsapp' && process.env.WHATSAPP_ENABLED !== 'false') {
        if (!conv.phone && !conv.external_id) {
            console.error('[whatsapp] send error: contacto sin teléfono ni JID');
        } else {
            try {
                await sendText(conv.phone, body, conv.external_id);
            } catch (err) {
                console.error('[whatsapp] send error', conv.phone || conv.external_id, err.message);
            }
        }
    }

    return { msg, conv };
}

async function listMessages(conversationId, limit = 100) {
    const { rows } = await query(
        `SELECT * FROM messages WHERE conversation_id = $1
         ORDER BY created_at ASC LIMIT $2`,
        [conversationId, limit]
    );
    return rows;
}

module.exports = {
    startWebConversation,
    getConversationByToken,
    handleVisitorMessage,
    handleAgentMessage,
    listMessages,
    addMessage
};
