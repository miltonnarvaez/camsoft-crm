const { query } = require('./db');

const VALID_TYPES = ['menu', 'keyword', 'fallback'];
const VALID_SECTORS = ['public', 'health', 'education', null, ''];

async function listBotFaqs(filters = {}) {
    const params = [];
    let sql = `SELECT id, trigger_key, question, answer, sort_order, active, faq_type, sector, keywords
               FROM bot_faqs WHERE 1=1`;
    if (filters.type) {
        params.push(filters.type);
        sql += ` AND faq_type = $${params.length}`;
    }
    if (filters.active === true) {
        sql += ` AND active = TRUE`;
    }
    sql += ` ORDER BY faq_type, sort_order ASC, id ASC`;
    const { rows } = await query(sql, params);
    return rows;
}

async function getBotFaq(id) {
    const { rows } = await query(`SELECT * FROM bot_faqs WHERE id = $1`, [id]);
    return rows[0] || null;
}

function slugKey(input) {
    return String(input || 'faq')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 48) || `faq_${Date.now()}`;
}

async function createBotFaq(data) {
    const {
        trigger_key,
        question,
        answer,
        faq_type = 'keyword',
        sector = null,
        keywords = null,
        sort_order = 50,
        active = true
    } = data;

    if (!VALID_TYPES.includes(faq_type)) throw new Error('faq_type inválido');
    if (!question?.trim() || !answer?.trim()) throw new Error('question y answer requeridos');

    const key = trigger_key?.trim() || `kw_${slugKey(question)}`;
    const { rows } = await query(
        `INSERT INTO bot_faqs (trigger_key, question, answer, sort_order, faq_type, sector, keywords, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [key, question.trim(), answer.trim(), sort_order, faq_type, sector || null, keywords, active]
    );
    return rows[0];
}

async function updateBotFaq(id, data) {
    const existing = await getBotFaq(id);
    if (!existing) throw new Error('FAQ no encontrada');

    const faq_type = data.faq_type ?? existing.faq_type;
    if (!VALID_TYPES.includes(faq_type)) throw new Error('faq_type inválido');

    const { rows } = await query(
        `UPDATE bot_faqs SET
            question = COALESCE($2, question),
            answer = COALESCE($3, answer),
            sort_order = COALESCE($4, sort_order),
            faq_type = COALESCE($5, faq_type),
            sector = $6,
            keywords = $7,
            active = COALESCE($8, active)
         WHERE id = $1 RETURNING *`,
        [
            id,
            data.question?.trim() || null,
            data.answer?.trim() || null,
            data.sort_order ?? null,
            faq_type,
            data.sector !== undefined ? (data.sector || null) : existing.sector,
            data.keywords !== undefined ? data.keywords : existing.keywords,
            data.active
        ]
    );
    return rows[0];
}

async function deleteBotFaq(id) {
    const { rows } = await query(
        `UPDATE bot_faqs SET active = FALSE WHERE id = $1 RETURNING *`,
        [id]
    );
    if (!rows[0]) throw new Error('FAQ no encontrada');
    return rows[0];
}

module.exports = {
    listBotFaqs,
    getBotFaq,
    createBotFaq,
    updateBotFaq,
    deleteBotFaq,
    VALID_TYPES,
    VALID_SECTORS
};
