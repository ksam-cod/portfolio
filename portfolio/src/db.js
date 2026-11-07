'use strict';
const { Pool } = require('pg');

function sslOption(url) {
  const flag = String(process.env.PGSSL || '').toLowerCase();
  if (flag === 'false' || flag === '0') return undefined;
  if (flag === 'true' || flag === '1') return { rejectUnauthorized: false };
  if (process.env.NODE_ENV === 'production' || /render\.com/i.test(url || '')) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function resolveConnectionString() {
  const candidates = [
    process.env.DATABASE_URL,
    process.env.Database_url,
    process.env.database_url,
  ];
  for (const raw of candidates) {
    if (raw && /^postgres(ql)?:\/\//i.test(raw.trim())) return raw.trim();
  }
  return 'postgres://postgres:postgres@localhost:5432/portfolio';
}

const connectionString = resolveConnectionString();

const pool = new Pool({
  connectionString,
  ssl: sslOption(connectionString),
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('Unexpected idle client error:', err.message));

module.exports = { pool, query: (text, params) => pool.query(text, params) };
