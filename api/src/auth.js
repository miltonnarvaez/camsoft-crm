const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('./db');

const JWT_SECRET = () => process.env.JWT_SECRET || 'change-me-in-production';

async function ensureAdminUser() {
    const email = process.env.ADMIN_EMAIL || 'admin@camsoft.com.co';
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
        console.warn('[auth] ADMIN_PASSWORD no definido; define uno en .env antes de producción.');
        return;
    }
    const { rows } = await query('SELECT id FROM admin_users WHERE email = $1', [email]);
    if (rows.length) return;
    const hash = await bcrypt.hash(password, 10);
    await query(
        'INSERT INTO admin_users (email, password_hash, name) VALUES ($1, $2, $3)',
        [email, hash, 'Milton']
    );
    console.log('[auth] Usuario admin creado:', email);
}

function signToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, name: user.name },
        JWT_SECRET(),
        { expiresIn: '7d' }
    );
}

async function login(email, password) {
    const { rows } = await query('SELECT * FROM admin_users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return null;
    return { token: signToken(user), user: { id: user.id, email: user.email, name: user.name } };
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No autorizado' });
    try {
        req.user = jwt.verify(token, JWT_SECRET());
        next();
    } catch {
        return res.status(401).json({ error: 'Token inválido' });
    }
}

module.exports = { ensureAdminUser, login, authMiddleware, signToken };
