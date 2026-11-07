'use strict';
// Usage: npm run migrate          (create tables)
//        npm run seed             (create tables + insert sample content)
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/db');

async function main() {
  const withSeed = process.argv.includes('--seed');
  const seedIfEmpty = process.argv.includes('--seed-if-empty');
  const files = ['schema.sql'].concat(withSeed ? ['seed.sql'] : []);
  for (const f of files) {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'db', f), 'utf8');
    await pool.query(sql);
    console.log('applied', f);
  }
  if (seedIfEmpty && !withSeed) {
    const { rows } = await pool.query('SELECT 1 FROM profile WHERE id = 1');
    if (!rows.length) {
      const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8');
      await pool.query(sql);
      console.log('applied seed.sql (empty database)');
    } else {
      console.log('skipped seed.sql (profile already present)');
    }
  }
}

main()
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
