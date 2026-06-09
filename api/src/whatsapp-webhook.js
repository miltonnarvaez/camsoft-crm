const { processBotMessage } = require('./bot');
const { addMessage } = require('./chat');
const {
    resolveWhatsappDestination,
    findOrCreateWhatsappContact,
    findOrCreateWhatsappConversation,
    sendText
} = require('./evolution');

function isIncomingMessageEvent(event) {
    const ev = String(event || '').toLowerCase();
    if (!ev) return false;
    if (ev.includes('update') || ev.includes('delete') || ev.includes('edit')) return false;
    return ev.includes('upsert') || ev.includes('received') || ev === 'message';
}

function extractText(data) {
    if (!data) return '';
    const msg = data.message || {};
    return (
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        msg.buttonsResponseMessage?.selectedDisplayText ||
        msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
        data.messageBody ||
        data.text ||
        ''
    ).trim();
}

/** Normaliza payloads Evolution API v2 (objeto único o array messages). */
function parseIncomingMessages(payload) {
    if (!isIncomingMessageEvent(payload.event || payload.type)) return [];

    const data = payload.data || payload;
    const rows = Array.isArray(data?.messages)
        ? data.messages
        : Array.isArray(data)
            ? data
            : data?.key || data?.message
                ? [data]
                : [];

    return rows
        .map((row) => {
            const key = row.key || {};
            const dest = resolveWhatsappDestination(key, payload);
            const text = extractText(row);
            return {
                key,
                ...dest,
                text,
                pushName: row.pushName || key.pushName || payload.pushName || null
            };
        })
        .filter((row) => row.text && (row.phone || row.jid || row.remoteJid) && !row.key.fromMe);
}

async function handleWhatsappWebhook(payload, emitConversation) {
    const items = parseIncomingMessages(payload);
    if (!items.length) return { processed: 0 };

    let processed = 0;
    for (const item of items) {
        if (String(item.remoteJid).includes('@g.us')) continue;

        const contactId = await findOrCreateWhatsappContact(
            item.phone,
            item.pushName,
            item.jid || item.remoteJid
        );
        const conversationId = await findOrCreateWhatsappConversation(contactId);

        const visitorMsg = await addMessage(conversationId, 'visitor', item.text, { channel: 'whatsapp' });
        const botResult = await processBotMessage(conversationId, item.text);
        const botMsg = await addMessage(conversationId, 'bot', botResult.reply);

        emitConversation(conversationId, 'message:new', { messages: [visitorMsg, botMsg] });

        if (process.env.WHATSAPP_BOT_REPLY !== 'false') {
            try {
                await sendText(item.phone, botResult.reply, item.jid || item.remoteJid);
            } catch (err) {
                console.error('[whatsapp] auto-reply error', item.phone || item.jid, err.message);
            }
        }
        processed += 1;
    }
    return { processed };
}

module.exports = { handleWhatsappWebhook, parseIncomingMessages, isIncomingMessageEvent };
