const { query } = require('./db');
const { BOT_SEED, INTRO_ITEMS, MENU_ITEMS } = require('./bot-content');
const { INTRO_BUTTONS, INTRO_LIST, SAL_LIST, resolveRowId } = require('./bot-interactive');
const { BOT_USAGE_HELP } = require('./bot-help');

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
        .filter((k) => k.length >= 1);
}

function textMatchesKeywords(text, keywords) {
    const t = normalize(text);
    const list = parseKeywordList(keywords);
    return list.some((k) => {
        if (k === '1' || k === '2') return t === k;
        return t.includes(k) || (k.length >= 4 && k.includes(t));
    });
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
    await query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS intent VARCHAR(32)`);
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

async function getConversationContext(conversationId) {
    const { rows } = await query(
        `SELECT sector, intent FROM leads WHERE conversation_id = $1 LIMIT 1`,
        [conversationId]
    );
    return rows[0] || { sector: null, intent: null };
}

async function setConversationIntent(conversationId, intent) {
    await query(
        `UPDATE leads SET intent = $2, updated_at = NOW() WHERE conversation_id = $1`,
        [conversationId, intent]
    );
}

function normalizeIntroChoice(text) {
    const t = normalize(text);
    if (t === '1' || t === '2') return t;
    if (/^(opcion|opción|option|numero|número)\s*[12]$/.test(t)) return t.slice(-1);
    if (/^[12][\.\):]\s*$/.test(t)) return t[0];
    return text;
}

function findIntroMatch(text) {
    const t = normalize(text);
    for (const item of INTRO_ITEMS) {
        const keys = parseKeywordList(item.keywords);
        if (keys.some((k) => (k === '1' || k === '2' ? t === k : t.includes(k)))) {
            return item;
        }
    }
    return null;
}

function findMenuMatch(text) {
    const t = normalize(text);
    return MENU_ITEMS.find((m) => {
        const label = normalize(m.label);
        return t.includes(m.key) || t.includes(label) || label.includes(t);
    });
}

async function findKeywordMatch(text, sector, intent) {
    const keywords = await loadActiveFaqs('keyword');
    let pool = keywords;

    if (intent === 'soporte') {
        pool = keywords.filter((k) => !k.sector);
    } else if (intent === 'ventas') {
        const sectorMatches = keywords.filter((k) => k.sector === sector);
        const globalMatches = keywords.filter((k) => !k.sector);
        pool = [...sectorMatches, ...globalMatches];
    }

    for (const row of pool) {
        if (textMatchesKeywords(text, row.keywords)) return row;
    }
    return null;
}

async function findMenuByKeywords(text, intent) {
    const menus = await loadActiveFaqs('menu');
    const skip = new Set(['greeting', 'fallback', 'soporte', 'ventas']);
    if (intent !== 'ventas') skip.add('public').add('health').add('education');

    for (const row of menus) {
        if (skip.has(row.trigger_key)) continue;
        if (row.keywords && textMatchesKeywords(text, row.keywords)) return row;
    }
    return null;
}

function buildIntroReply() {
    return getFaqByKey('greeting').then((greeting) => greeting || '¿Soporte o ventas? Responde 1 o 2.');
}

async function findIntroMatchFromDb(text) {
    const menus = await loadActiveFaqs('menu');
    for (const row of menus) {
        if (!['soporte', 'ventas'].includes(row.trigger_key)) continue;
        if (row.keywords && textMatchesKeywords(text, row.keywords)) {
            return { key: row.trigger_key, label: row.question, keywords: row.keywords };
        }
    }
    return null;
}

async function findAnySectorOrKeyword(text, intent) {
    const menus = await loadActiveFaqs('menu');
    const skip = new Set(['greeting', 'fallback']);
    for (const row of menus) {
        if (skip.has(row.trigger_key)) continue;
        if (row.keywords && textMatchesKeywords(text, row.keywords)) {
            return { kind: 'menu', row };
        }
    }
    const keywords = await loadActiveFaqs('keyword');
    const pool = intent === 'soporte' ? keywords.filter((k) => !k.sector) : keywords;
    for (const row of pool) {
        if (textMatchesKeywords(text, row.keywords)) return { kind: 'keyword', row };
    }
    return null;
}

function introResponse(reply, extra = {}) {
    const out = { reply, hotLead: false, sector: null, ...extra };
    if (process.env.WHATSAPP_INTERACTIVE === 'true') {
        out.interactive = INTRO_BUTTONS;
    }
    return out;
}

function salesMenuResponse(reply, extra = {}) {
    const out = { reply, ...extra };
    if (process.env.WHATSAPP_INTERACTIVE === 'true') {
        out.interactive = SAL_LIST;
    }
    return out;
}

async function buildSalesMenuReply() {
    return `*Ventas — CamSoft*

Responde *escribiendo* el número (no toques el mensaje):

1 = 🏛 Sector público (concejos, portales)
2 = 🏥 Sector salud
3 = 🎓 Sector educación
4 = 👤 Hablar con una persona
5 = 📞 Datos de contacto

También puedes escribir: concejo, LMS, cotización, etc.`;
}

async function resolveMenuAnswer(key) {
    if (key === 'ventas') return buildSalesMenuReply();
    let answer = await getFaqByKey(key);
    if (answer === '__SALES_MENU__') answer = await buildSalesMenuReply();
    return answer;
}

async function applyLeadUpdates(conversationId, matchKey, intent) {
    if (intent) {
        await setConversationIntent(conversationId, intent);
    }
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
    if (matchKey === 'soporte') {
        await query(
            `UPDATE leads SET score = GREATEST(score, 10), updated_at = NOW() WHERE conversation_id = $1`,
            [conversationId]
        );
    }
    if (matchKey === 'ventas') {
        await query(
            `UPDATE leads SET score = GREATEST(score, 15), updated_at = NOW() WHERE conversation_id = $1`,
            [conversationId]
        );
    }
}

async function processBotMessage(conversationId, text) {
    text = resolveRowId(text);
    text = normalizeIntroChoice(text);
    const t = normalize(text);
    const ctx = await getConversationContext(conversationId);
    let intent = ctx.intent;

    if (!t || t === 'hola' || t === 'inicio') {
        await setConversationIntent(conversationId, null);
        const reply = await buildIntroReply();
        return introResponse(reply);
    }

    if (t === 'menu' || t === 'ayuda' || t === 'help' || t.includes('como funciona') || t.includes('que escribo') || t.includes('no entiendo')) {
        if (t === 'ayuda' || t === 'help' || t.includes('como funciona') || t.includes('que escribo') || t.includes('no entiendo')) {
            return { reply: BOT_USAGE_HELP, hotLead: false, sector: ctx.sector };
        }
        if (intent === 'ventas') {
            const reply = await buildSalesMenuReply();
            return salesMenuResponse(reply, { sector: ctx.sector });
        }
        if (intent === 'soporte') {
            const answer = await getFaqByKey('soporte');
            return { reply: answer, hotLead: false, sector: null };
        }
        const reply = await buildIntroReply();
        return introResponse(reply);
    }

    if (!intent) {
        let intro = findIntroMatch(text);
        if (!intro) intro = await findIntroMatchFromDb(text);
        if (intro) {
            await applyLeadUpdates(conversationId, intro.key, intro.key);
            const answer = await resolveMenuAnswer(intro.key);
            if (intro.key === 'ventas') {
                return salesMenuResponse(answer, { hotLead: false });
            }
            return { reply: answer, hotLead: intro.key === 'soporte', sector: null };
        }
        const reply = `${await buildIntroReply()}\n\n(No entendí. Escribe solo: 1, 2, soporte, ventas o ayuda)`;
        return introResponse(reply);
    }

    if (intent === 'soporte') {
        if (t.includes('ventas') || t === '2') {
            await applyLeadUpdates(conversationId, 'ventas', 'ventas');
            const reply = await buildSalesMenuReply();
            return salesMenuResponse(reply);
        }
        const humanMatch = findMenuMatch(text);
        if (humanMatch?.key === 'human' || humanMatch?.key === 'contact') {
            const answer = await getFaqByKey(humanMatch.key);
            await applyLeadUpdates(conversationId, humanMatch.key, 'soporte');
            return { reply: answer, hotLead: humanMatch.key === 'human', sector: null };
        }
        const kw = await findKeywordMatch(text, null, 'soporte');
        if (kw) {
            return { reply: kw.answer, hotLead: kw.trigger_key.includes('human'), sector: null };
        }
        if (textMatchesKeywords(text, 'hablar con una persona,humano,persona,asesor')) {
            await applyLeadUpdates(conversationId, 'human', 'soporte');
            return { reply: await getFaqByKey('human'), hotLead: true, sector: null };
        }
        const any = await findAnySectorOrKeyword(text, 'soporte');
        if (any) {
            const answer = any.kind === 'menu' ? any.row.answer : any.row.answer;
            return { reply: answer, hotLead: false, sector: any.row.sector || null };
        }
        const fallback = await getFaqByKey('fallback');
        return { reply: fallback, hotLead: false, sector: null };
    }

    // intent === ventas
    const SAL_NUM = {
        '1': 'public',
        '2': 'health',
        '3': 'education',
        '4': 'human',
        '5': 'contact'
    };
    if (SALES_NUM[t]) {
        const key = SAL_NUM[t];
        const answer = await resolveMenuAnswer(key);
        await applyLeadUpdates(conversationId, key, 'ventas');
        return {
            reply: answer,
            hotLead: key === 'human',
            sector: ['public', 'health', 'education'].includes(key) ? key : null
        };
    }

    if (t === '2' || t.includes('ventas')) {
        const reply = await buildSalesMenuReply();
        return salesMenuResponse(reply, { sector: ctx.sector });
    }
    if (t === '1' || t.includes('soporte')) {
        await applyLeadUpdates(conversationId, 'soporte', 'soporte');
        return { reply: await getFaqByKey('soporte'), hotLead: false, sector: null };
    }

    const menuDirect = findMenuMatch(text);
    if (menuDirect) {
        const answer = await resolveMenuAnswer(menuDirect.key);
        const hotLead = menuDirect.key === 'human';
        await applyLeadUpdates(conversationId, menuDirect.key, 'ventas');
        return {
            reply: answer,
            hotLead,
            sector: menuDirect.key === 'human' ? null : menuDirect.key
        };
    }

    const menuByKw = await findMenuByKeywords(text, 'ventas');
    if (menuByKw) {
        const hotLead = menuByKw.trigger_key === 'human';
        await applyLeadUpdates(conversationId, menuByKw.trigger_key, 'ventas');
        return { reply: menuByKw.answer, hotLead, sector: menuByKw.sector };
    }

    const sector = ctx.sector;
    const kwMatch = await findKeywordMatch(text, sector, 'ventas');
    if (kwMatch) {
        if (kwMatch.sector) {
            await query(
                `UPDATE leads SET sector = $2, score = GREATEST(score, 15), updated_at = NOW()
                 WHERE conversation_id = $1`,
                [conversationId, kwMatch.sector]
            );
        }
        return { reply: kwMatch.answer, hotLead: kwMatch.trigger_key === 'human', sector: kwMatch.sector };
    }

    const any = await findAnySectorOrKeyword(text, 'ventas');
    if (any) {
        const row = any.row;
        if (any.kind === 'menu') {
            await applyLeadUpdates(conversationId, row.trigger_key, 'ventas');
            return {
                reply: row.answer,
                hotLead: row.trigger_key === 'human',
                sector: row.sector || null
            };
        }
        if (row.sector) {
            await query(
                `UPDATE leads SET sector = $2, score = GREATEST(score, 15), updated_at = NOW()
                 WHERE conversation_id = $1`,
                [conversationId, row.sector]
            );
        }
        return { reply: row.answer, hotLead: row.trigger_key === 'human', sector: row.sector };
    }

    if (t.includes('whatsapp') || t.includes('wsp')) {
        return {
            reply: 'Puedes continuar por WhatsApp al +57 316 681 2189, o escribe *hablar con una persona*.',
            hotLead: true,
            sector: null
        };
    }

    const fallback = await getFaqByKey('fallback');
    return { reply: fallback, hotLead: false, sector: null };
}

module.exports = {
    processBotMessage,
    ensureBotFaqs,
    seedBotContent,
    loadActiveFaqs,
    INTRO_ITEMS,
    MENU_ITEMS,
    normalize,
    textMatchesKeywords
};
