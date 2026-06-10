const { query } = require('./db');
const { BOT_SEED, MENU_ITEMS } = require('./bot-content');

function normalize(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function parseKeywordList(keywords) {
    if (!keywords) return [];
    return keywords
        .split(',')
        .map((k) => normalize(k))
        .filter((k) => k.length >= 2);
}

function textMatchesKeywords(text, keywords) {
    const t = normalize(text);
    const list = parseKeywordList(keywords);
    return list.some((k) => t.includes(k) || (k.length >= 4 && k.includes(t)));
}

async function ensureBotSchema() {
    await query(`
        CREATE TABLE IF NOT EXISTS bot_faqs (
            id              SERIAL PRIMARY KEY,
            trigger_key     VARCHAR(64) NOT NULL UNIQUE,
            question        TEXT NOT NULL,
            answer          TEXT NOT NULL,
            sort_order      INT NOT NULL DEFAULT 0,
            active          BOOLEAN NOT NULL DEFAULT TRUE,
            faq_type        VARCHAR(16) NOT NULL DEFAULT 'menu',
            sector          VARCHAR(32),
            keywords        TEXT
        )
    `);
    await query(`ALTER TABLE bot_faqs ADD COLUMN IF NOT EXISTS faq_type VARCHAR(16) NOT NULL DEFAULT 'menu'`);
    await query(`ALTER TABLE bot_faqs ADD COLUMN IF NOT EXISTS sector VARCHAR(32)`);
    await query(`ALTER TABLE bot_faqs ADD COLUMN IF NOT EXISTS keywords TEXT`);
}

async function seedBotContent(forceUpdate = false) {
    await ensureBotSchema();
    for (const item of BOT_SEED) {
        if (forceUpdate) {
            await query(
                `INSERT INTO bot_faqs (trigger_key, question, answer, sort_order, faq_type, sector, keywords, active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
                 ON CONFLICT (trigger_key) DO UPDATE SET
                    question = EXCLUDED.question,
                    answer = EXCLUDED.answer,
                    sort_order = EXCLUDED.sort_order,
                    faq_type = EXCLUDED.faq_type,
                    sector = EXCLUDED.sector,
                    keywords = EXCLUDED.keywords,
                    active = TRUE`,
                [
                    item.trigger_key,
                    item.question,
                    item.answer,
                    item.sort_order,
                    item.faq_type,
                    item.sector,
                    item.keywords
                ]
            );
        } else {
            await query(
                `INSERT INTO bot_faqs (trigger_key, question, answer, sort_order, faq_type, sector, keywords, active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
                 ON CONFLICT (trigger_key) DO NOTHING`,
                [
                    item.trigger_key,
                    item.question,
                    item.answer,
                    item.sort_order,
                    item.faq_type,
                    item.sector,
                    item.keywords
                ]
            );
        }
    }
    console.log('[bot] contenido', forceUpdate ? 'actualizado' : 'verificado');
}

async function ensureBotFaqs() {
    try {
        await seedBotContent(false);
    } catch (err) {
        console.warn('[bot] ensureBotFaqs:', err.message);
    }
}

async function getFaqByKey(key) {
    const { rows } = await query(
        `SELECT answer FROM bot_faqs WHERE trigger_key = $1 AND active = TRUE`,
        [key]
    );
    const seed = BOT_SEED.find((s) => s.trigger_key === key);
    return rows[0]?.answer?.trim() || seed?.answer || null;
}

async function loadActiveFaqs(type = null) {
    const params = [];
    let sql = `SELECT * FROM bot_faqs WHERE active = TRUE`;
    if (type) {
        params.push(type);
        sql += ` AND faq_type = $1`;
    }
    sql += ` ORDER BY sort_order ASC, id ASC`;
    const { rows } = await query(sql, params);
    return rows;
}

async function getConversationSector(conversationId) {
    const { rows } = await query(
        `SELECT sector FROM leads WHERE conversation_id = $1 LIMIT 1`,
        [conversationId]
    );
    return rows[0]?.sector || null;
}

function findMenuMatch(text) {
    const t = normalize(text);
    return MENU_ITEMS.find((m) => {
        const label = normalize(m.label);
        return t.includes(m.key) || t.includes(label) || label.includes(t);
    });
}

async function findKeywordMatch(text, sector) {
    const keywords = await loadActiveFaqs('keyword');
    const sectorMatches = keywords.filter((k) => k.sector === sector);
    const globalMatches = keywords.filter((k) => !k.sector);

    for (const row of [...sectorMatches, ...globalMatches]) {
        if (textMatchesKeywords(text, row.keywords)) return row;
    }
    return null;
}

async function findMenuByKeywords(text) {
    const menus = await loadActiveFaqs('menu');
    for (const row of menus) {
        if (row.trigger_key === 'greeting' || row.trigger_key === 'fallback') continue;
        if (row.keywords && textMatchesKeywords(text, row.keywords)) return row;
    }
    return null;
}

function buildMenuReply(greeting) {
    const options = MENU_ITEMS.map((m) => `• ${m.label}`).join('\n');
    return `${greeting}\n\nEscribe una opción o el nombre del sector:\n${options}`;
}

async function applyLeadUpdates(conversationId, matchKey) {
    if (matchKey === 'human') {
        await query(
            `UPDATE leads SET stage = 'contacted', score = GREATEST(score, 50), updated_at = NOW()
             WHERE conversation_id = $1`,
            [conversationId]
        );
    }
    if (['public', 'health', 'education'].includes(matchKey)) {
        await query(
            `UPDATE leads SET sector = $2, score = GREATEST(score, 20), updated_at = NOW()
             WHERE conversation_id = $1`,
            [conversationId, matchKey]
        );
    }
}

async function processBotMessage(conversationId, text) {
    const t = normalize(text);

    if (!t || t === 'hola' || t === 'menu' || t === 'inicio' || t === 'ayuda') {
        const greeting = await getFaqByKey('greeting');
        return {
            reply: buildMenuReply(greeting),
            hotLead: false,
            sector: null
        };
    }

    const menuDirect = findMenuMatch(text);
    if (menuDirect) {
        const answer = await getFaqByKey(menuDirect.key);
        const hotLead = menuDirect.key === 'human';
        await applyLeadUpdates(conversationId, menuDirect.key);
        return {
            reply: answer,
            hotLead,
            sector: menuDirect.key === 'human' ? null : menuDirect.key
        };
    }

    const menuByKw = await findMenuByKeywords(text);
    if (menuByKw) {
        const hotLead = menuByKw.trigger_key === 'human';
        await applyLeadUpdates(conversationId, menuByKw.trigger_key);
        return {
            reply: menuByKw.answer,
            hotLead,
            sector: menuByKw.sector
        };
    }

    const sector = await getConversationSector(conversationId);
    const kwMatch = await findKeywordMatch(text, sector);
    if (kwMatch) {
        const hotLead = kwMatch.trigger_key === 'human';
        if (kwMatch.sector) {
            await query(
                `UPDATE leads SET sector = $2, score = GREATEST(score, 15), updated_at = NOW()
                 WHERE conversation_id = $1`,
                [conversationId, kwMatch.sector]
            );
        }
        return {
            reply: kwMatch.answer,
            hotLead,
            sector: kwMatch.sector
        };
    }

    if (t.includes('whatsapp') || t.includes('wsp')) {
        return {
            reply: 'Puedes continuar por WhatsApp al +57 317 374 2174, o escribe *hablar con una persona* y te contactamos.',
            hotLead: true,
            sector: null
        };
    }

    const fallback = await getFaqByKey('fallback');
    return {
        reply: fallback,
        hotLead: false,
        sector: null
    };
}

module.exports = {
    processBotMessage,
    ensureBotFaqs,
    seedBotContent,
    loadActiveFaqs,
    MENU_ITEMS,
    normalize,
    textMatchesKeywords
};
