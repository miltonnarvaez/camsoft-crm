const { query } = require('./db');

const MENU = [
    { key: 'public', label: 'Sector público' },
    { key: 'health', label: 'Sector salud' },
    { key: 'education', label: 'Sector educación' },
    { key: 'human', label: 'Hablar con una persona' },
    { key: 'contact', label: 'Datos de contacto' }
];

function normalize(text) {
    return (text || '').toLowerCase().trim();
}

async function getFaq(key) {
    const { rows } = await query(
        'SELECT answer FROM bot_faqs WHERE trigger_key = $1 AND active = TRUE',
        [key]
    );
    return rows[0]?.answer || null;
}

async function processBotMessage(conversationId, text) {
    const t = normalize(text);

    if (!t || t === 'hola' || t === 'menu' || t === 'inicio') {
        const greeting = await getFaq('greeting');
        const options = MENU.map((m) => `• ${m.label}`).join('\n');
        return {
            reply: `${greeting}\n\nEscribe una opción o el nombre del sector:\n${options}`,
            hotLead: false,
            sector: null
        };
    }

    const match = MENU.find((m) => t.includes(m.key) || t.includes(m.label.toLowerCase()));
    if (match) {
        const answer = await getFaq(match.key);
        const hotLead = match.key === 'human';
        if (hotLead) {
            await query(
                `UPDATE leads SET stage = 'contacted', score = GREATEST(score, 50), updated_at = NOW()
                 WHERE conversation_id = $1`,
                [conversationId]
            );
        }
        if (['public', 'health', 'education'].includes(match.key)) {
            await query(
                `UPDATE leads SET sector = $2, score = GREATEST(score, 20), updated_at = NOW()
                 WHERE conversation_id = $1`,
                [conversationId, match.key]
            );
        }
        return { reply: answer, hotLead, sector: match.key };
    }

    if (t.includes('whatsapp') || t.includes('wsp')) {
        return {
            reply: 'Puedes continuar por WhatsApp escribiendo al +57 317 374 2174, o deja tu número aquí y te contactamos.',
            hotLead: true,
            sector: null
        };
    }

    return {
        reply: 'Gracias por el mensaje. Si quieres, escribe *menu* para ver opciones o *hablar con una persona* para que Milton te responda.',
        hotLead: false,
        sector: null
    };
}

module.exports = { processBotMessage, MENU };
