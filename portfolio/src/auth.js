'use strict';
const crypto = require('crypto');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

// Bearer-token guard for admin routes. Disabled entirely if ADMIN_TOKEN is missing/weak.
function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || expected.length < 16) {
    return res.status(503).json({ error: 'Admin API disabled: set ADMIN_TOKEN (min 16 chars).' });
  }
  const header = req.get('authorization') || '';
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!supplied || !crypto.timingSafeEqual(sha(supplied), sha(expected))) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Tiny in-memory fixed-window rate limiter (per IP). Fine for a single instance.
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const now = Date.now();
    const entry = hits.get(req.ip);
    if (!entry || entry.reset <= now) {
      hits.set(req.ip, { count: 1, reset: now + windowMs });
      return next();
    }
    if (++entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
    next();
  };
}

module.exports = { requireAdmin, rateLimit };
