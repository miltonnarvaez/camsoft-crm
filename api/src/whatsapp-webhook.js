const { processBotMessage } = require('./bot');
const { addMessage } = require('./chat');
const {
    resolveWhatsappDestination,
    findOrCreateWhatsappContact,
    findOrCreateWhatsappConversation,
    sendBotReply
} = require('./evolution');
const {
    acquireInboundLock,
    releaseInboundLock,
    isLidDuplicateEvent
} = require('./whatsapp-dedupe');

function parseMessageObject(data) {
    let msg = data?.message ?? data;
    if (typeof msg === 'string') {
        try {
            msg = JSON.parse(msg);
        } catch (_) {
            msg = {};
        }
    }
    return msg || {};
}

function isInteractiveResponse(data) {
    const msg = parseMessageObject(data);
    return !!(
        msg.listResponseMessage ||
        msg.buttonsResponseMessage ||
        msg.templateButtonReplyMessage
    );
}

function isIncomingMessageEvent(event, data) {
    const ev = String(event || '').toLowerCase();
    if (!ev) return false;
    if (ev.includes('delete') || ev.includes('edit')) return false;
    if (ev.includes('update')) return isInteractiveResponse(data);
    return ev.includes('upsert') || ev.includes('received') || ev === 'message';
}

function extractText(data) {
    if (!data) return '';
    const msg = parseMessageObject(data);
    const listReply = msg.listResponseMessage?.singleSelectReply;
    const listId = listReply?.selectedRowId;
    const buttonId = msg.buttonsResponseMessage?.selectedButtonId
        || msg.templateButtonReplyMessage?.selectedId;
    if (listId) return String(listId);
    if (buttonId) return String(buttonId);
    const display = listReply?.selectedDisplayText
        || msg.buttonsResponseMessage?.selectedDisplayText;
    if (display) return String(display);
    return (
        msg.conversation ||
        msg.extendedTextMessage?.text ||
        data.messageBody ||
        data.text ||
        ''
    ).trim();
}

/** Normaliza payloads Evolution API v2 (objeto único o array messages). */
function parseIncomingMessages(payload) {
    const event = payload.event || payload.type;
    const data = payload.data || payload;

    const isMessageEvent = event ? isIncomingMessageEvent(event, data) : false;
    const isMessagePayload = !event && data?.key?.remoteJid && extractText(data);

    if (!isMessageEvent && !isMessagePayload) return [];

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

    const event = payload.event || payload.type || 'desconocido';
    console.log('[webhook whatsapp] evento:', event, 'items:', items.length, 'texto:', items[0]?.text);

    if (items[0]) {
        const k = items[0].key || {};
        console.log('[webhook whatsapp] destino:', {
            phone: items[0].phone,
            jid: items[0].jid,
            remoteJid: items[0].remoteJid,
            waMsgId: k.id
        });
    }

    let processed = 0;
    for (const item of items) {
        if (String(item.remoteJid).includes('@g.us')) continue;

        if (isLidDuplicateEvent(item)) {
            console.log('[webhook whatsapp] @lid duplicado:', item.key?.id);
            continue;
        }

        const waMsgId = item.key?.id || null;
        const locked = await acquireInboundLock(waMsgId, item.phone, item.text);
        if (!locked) {
            console.log('[webhook whatsapp] duplicado:', waMsgId || item.text?.slice(0, 40));
            continue;
        }

        try {
            const replyJid = item.jid || item.remoteJid;
            const contactId = await findOrCreateWhatsappContact(
                item.phone,
                item.pushName,
                replyJid
            );
            const conversationId = await findOrCreateWhatsappConversation(contactId);

            const visitorMsg = await addMessage(conversationId, 'visitor', item.text, {
                channel: 'whatsapp',
                waMsgId
            });
            const botResult = await processBotMessage(conversationId, item.text);
            const botMsg = await addMessage(conversationId, 'bot', botResult.reply);

            emitConversation(conversationId, 'message:new', { messages: [visitorMsg, botMsg] });

            if (process.env.WHATSAPP_BOT_REPLY !== 'false') {
                try {
                    await sendBotReply(
                        item.phone,
                        botResult,
                        replyJid,
                        item.remoteJid,
                        item.remoteJidAlt || item.key?.remoteJidAlt,
                        item.key
                    );
                } catch (err) {
                    const detail = err?.message || JSON.stringify(err);
                    console.error('[whatsapp] auto-reply error', item.phone || replyJid, detail);
                }
            }
            processed += 1;
        } finally {
            releaseInboundLock(waMsgId, item.phone, item.text);
        }
    }
    return { processed };
}

module.exports = { handleWhatsappWebhook, parseIncomingMessages, isIncomingMessageEvent };
