'use strict';
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/portfolio',
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('Unexpected idle client error:', err.message));

module.exports = { pool, query: (text, params) => pool.query(text, params) };
