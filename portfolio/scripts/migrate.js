'use strict';
// Usage: npm run migrate          (create tables)
//        npm run seed             (create tables + insert sample content)
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function main() {
  const withSeed = process.argv.includes('--seed');
  const files = ['schema.sql'].concat(withSeed ? ['seed.sql'] : []);
  for (const f of files) {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'db', f), 'utf8');
    await pool.query(sql);
    console.log('applied', f);
  }
}

main()
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
