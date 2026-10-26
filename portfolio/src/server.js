'use strict';
const path = require('path');
const express = require('express');
const { query } = require('./db');
const { requireAdmin, rateLimit } = require('./auth');
const { crudRouter, ValidationError, pick } = require('./crud');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // correct client IP behind a reverse proxy / PaaS
app.use(express.json({ limit: '20kb' }));

// Security headers (kept dependency-free)
app.use((_req, res, next) => {
  res.set({
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; " +
      "font-src https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; " +
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
  });
  next();
});

// ---------- Field specs ----------
const projectFields = {
  title: { type: 'string', required: true, max: 120 },
  summary: { type: 'string', required: true, max: 600 },
  image_url: { type: 'url' },
  repo_url: { type: 'url' },
  live_url: { type: 'url' },
  tech: { type: 'array' },
  featured: { type: 'bool' },
  sort_order: { type: 'int' },
};
const skillFields = {
  name: { type: 'string', required: true, max: 60 },
  category: { type: 'string', max: 60 },
  sort_order: { type: 'int' },
};
const experienceFields = {
  role: { type: 'string', required: true, max: 120 },
  company: { type: 'string', required: true, max: 120 },
  description: { type: 'string', max: 800 },
  start_date: { type: 'date', required: true },
  end_date: { type: 'date' },
};
const profileFields = {
  full_name: { type: 'string', required: true, max: 120 },
  headline: { type: 'string', required: true, max: 200 },
  bio: { type: 'string', required: true, max: 1500 },
  location: { type: 'string', max: 120 },
  email: { type: 'string', max: 254 },
  phone: { type: 'string', max: 40 },
  github_url: { type: 'url' },
  linkedin_url: { type: 'url' },
  available: { type: 'bool' },
};

// ---------- Public + admin routes ----------
app.get('/api/health', async (_req, res) => {
  try { await query('SELECT 1'); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false }); }
});

app.get('/api/profile', async (_req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM profile WHERE id = 1');
    res.json(rows[0] || null);
  } catch (e) { next(e); }
});

// Upsert so a fresh (unseeded) database can still be configured through the API
app.put('/api/profile', requireAdmin, async (req, res, next) => {
  try {
    const data = pick(profileFields, req.body, { requireAll: false });
    const keys = Object.keys(data);
    if (!keys.length) throw new ValidationError('No valid fields supplied');
    const cols = ['id', ...keys, 'updated_at'];
    const vals = keys.map((k) => data[k]);
    const sql =
      `INSERT INTO profile (${cols.join(', ')}) VALUES (1, ${keys.map((_, i) => `$${i + 1}`).join(', ')}, now()) ` +
      `ON CONFLICT (id) DO UPDATE SET ${keys.map((k) => `${k} = EXCLUDED.${k}`).join(', ')}, updated_at = now() RETURNING *`;
    const { rows } = await query(sql, vals);
    res.json(rows[0]);
  } catch (e) {
    // First-time insert without required columns violates NOT NULL
    if (e.code === '23502') return next(new ValidationError(`${e.column} is required when creating the profile`));
    next(e);
  }
});

app.use('/api/projects', crudRouter({ table: 'projects', fields: projectFields, orderBy: 'sort_order, id' }));
app.use('/api/skills', crudRouter({ table: 'skills', fields: skillFields, orderBy: 'sort_order, id' }));
app.use('/api/experience', crudRouter({ table: 'experience', fields: experienceFields, orderBy: 'start_date DESC' }));

// Contact form (public, rate limited)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
app.post('/api/messages', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), async (req, res, next) => {
  try {
    const { name, email, body, website } = req.body || {};
    if (website) return res.status(201).json({ ok: true }); // honeypot: silently drop bots
    if (typeof name !== 'string' || !name.trim() || name.length > 120) throw new ValidationError('Please enter your name');
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.length > 254) throw new ValidationError('Please enter a valid email');
    if (typeof body !== 'string' || !body.trim() || body.length > 5000) throw new ValidationError('Please enter a message (max 5000 characters)');
    await query('INSERT INTO messages (name, email, body) VALUES ($1, $2, $3)', [name.trim(), email.trim(), body.trim()]);
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

// Inbox (admin)
app.get('/api/admin/messages', requireAdmin, async (_req, res, next) => {
  try { res.json((await query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 500')).rows); }
  catch (e) { next(e); }
});
app.patch('/api/admin/messages/:id(\\d+)', requireAdmin, async (req, res, next) => {
  try {
    if (typeof req.body?.is_read !== 'boolean') throw new ValidationError('is_read must be true or false');
    const { rows } = await query('UPDATE messages SET is_read = $1 WHERE id = $2 RETURNING *', [req.body.is_read, Number(req.params.id)]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});
app.delete('/api/admin/messages/:id(\\d+)', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await query('DELETE FROM messages WHERE id = $1', [Number(req.params.id)]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (e) { next(e); }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// ---------- Frontend ----------
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: 0, extensions: ['html'] }));

// ---------- Errors ----------
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  if (err.code === '23505') return res.status(409).json({ error: 'Already exists' });
  if (err.code === '23514') return res.status(400).json({ error: 'Value violates a database constraint' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT) || 3000;
if (require.main === module) {
  app.listen(port, () => console.log(`Portfolio running on http://localhost:${port}`));
}
module.exports = app;
