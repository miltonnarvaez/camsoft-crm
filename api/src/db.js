const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10
});

pool.on('error', (err) => {
    console.error('[db] pool error', err.message);
});

async function query(text, params) {
    return pool.query(text, params);
}

module.exports = { pool, query };
