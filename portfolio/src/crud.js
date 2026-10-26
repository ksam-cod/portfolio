'use strict';
const express = require('express');
const { query } = require('./db');
const { requireAdmin } = require('./auth');

class ValidationError extends Error {}

const URL_RE = /^https?:\/\/[^\s]+$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Validate/coerce one value according to a field spec. Returns the cleaned value.
function clean(name, spec, value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') {
    if (spec.required) throw new ValidationError(`${name} is required`);
    return spec.type === 'array' ? [] : null;
  }
  switch (spec.type) {
    case 'string': {
      if (typeof value !== 'string') throw new ValidationError(`${name} must be a string`);
      const v = value.trim();
      if (!v && spec.required) throw new ValidationError(`${name} is required`);
      if (v.length > (spec.max || 500)) throw new ValidationError(`${name} is too long`);
      return v;
    }
    case 'url': {
      if (typeof value !== 'string' || !URL_RE.test(value.trim()) || value.length > 2000)
        throw new ValidationError(`${name} must be an http(s) URL`);
      return value.trim();
    }
    case 'bool':
      if (typeof value !== 'boolean') throw new ValidationError(`${name} must be true or false`);
      return value;
    case 'int':
      if (!Number.isInteger(value) || Math.abs(value) > 1e6) throw new ValidationError(`${name} must be an integer`);
      return value;
    case 'date':
      if (typeof value !== 'string' || !DATE_RE.test(value) || Number.isNaN(Date.parse(value)))
        throw new ValidationError(`${name} must be a date (YYYY-MM-DD)`);
      return value;
    case 'array':
      if (!Array.isArray(value) || value.length > 30 || value.some((x) => typeof x !== 'string' || !x.trim() || x.length > 60))
        throw new ValidationError(`${name} must be an array of up to 30 short strings`);
      return value.map((x) => x.trim());
    default:
      throw new Error('bad spec');
  }
}

function pick(fields, body, { requireAll }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('JSON object body required');
  const out = {};
  for (const [name, spec] of Object.entries(fields)) {
    if (requireAll && spec.required && body[name] === undefined) throw new ValidationError(`${name} is required`);
    const v = clean(name, spec, body[name]);
    if (v !== undefined) out[name] = v;
  }
  return out;
}

// Builds a router: public GET list, admin-only POST / PUT /:id / DELETE /:id.
// `table`, `fields` keys and `orderBy` come from code, never from user input.
function crudRouter({ table, fields, orderBy }) {
  const router = express.Router();
  const cols = Object.keys(fields);

  router.get('/', async (_req, res, next) => {
    try {
      const { rows } = await query(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
      res.json(rows);
    } catch (e) { next(e); }
  });

  router.post('/', requireAdmin, async (req, res, next) => {
    try {
      const data = pick(fields, req.body, { requireAll: true });
      const keys = Object.keys(data);
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`;
      const { rows } = await query(sql, keys.map((k) => data[k]));
      res.status(201).json(rows[0]);
    } catch (e) { next(e); }
  });

  router.put('/:id(\\d+)', requireAdmin, async (req, res, next) => {
    try {
      const data = pick(fields, req.body, { requireAll: false });
      const keys = Object.keys(data).filter((k) => cols.includes(k));
      if (!keys.length) throw new ValidationError('No valid fields supplied');
      const sql = `UPDATE ${table} SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE id = $${keys.length + 1} RETURNING *`;
      const { rows } = await query(sql, [...keys.map((k) => data[k]), Number(req.params.id)]);
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (e) { next(e); }
  });

  router.delete('/:id(\\d+)', requireAdmin, async (req, res, next) => {
    try {
      const { rowCount } = await query(`DELETE FROM ${table} WHERE id = $1`, [Number(req.params.id)]);
      if (!rowCount) return res.status(404).json({ error: 'Not found' });
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { crudRouter, ValidationError, pick, clean };
