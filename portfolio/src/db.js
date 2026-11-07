'use strict';
const { Pool } = require('pg');

function sslOption() {
  const flag = String(process.env.PGSSL || '').toLowerCase();
  if (flag === 'false' || flag === '0') return undefined;
  if (flag === 'true' || flag === '1') return { rejectUnauthorized: false };
  const url = process.env.DATABASE_URL || '';
  if (process.env.NODE_ENV === 'production' || /render\.com/i.test(url)) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/portfolio',
  ssl: sslOption(),
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('Unexpected idle client error:', err.message));

module.exports = { pool, query: (text, params) => pool.query(text, params) };
