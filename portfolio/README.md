# Obsidian Indigo Portfolio

Express + PostgreSQL backend serving a mobile-first portfolio frontend styled from `DESIGN.md`.

## Run it

```bash
npm install
cp .env.example .env        # set DATABASE_URL and ADMIN_TOKEN
createdb portfolio          # or use any Postgres URL
npm run seed                # creates tables + sample content (use `npm run migrate` for tables only)
npm start                   # http://localhost:3000
```

Requires Node 20.6+ and PostgreSQL 13+.

## API

Public: `GET /api/profile`, `/api/projects`, `/api/skills`, `/api/experience`, `/api/health`; `POST /api/messages` (contact form, 5 per 15 min per IP).

Admin (header `Authorization: Bearer <ADMIN_TOKEN>`):

| Resource | Endpoints |
|---|---|
| Profile | `PUT /api/profile` (upsert) |
| Projects / Skills / Experience | `POST /api/<res>`, `PUT /api/<res>/:id`, `DELETE /api/<res>/:id` |
| Inbox | `GET /api/admin/messages`, `PATCH /api/admin/messages/:id` `{is_read}`, `DELETE /api/admin/messages/:id` |

Example:

```bash
curl -X POST localhost:3000/api/projects -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"My app","summary":"What it does","tech":["Node.js"],"featured":true}'
```

## Layout

- `db/schema.sql`, `db/seed.sql`: tables and sample data
- `src/`: `server.js` (routes), `crud.js` (validated CRUD factory), `auth.js` (token guard, rate limiter), `db.js`
- `public/`: frontend (`index.html`, `styles.css`, `app.js`), rendered from the live API

## Notes

- `DESIGN.md` lists two slightly different palettes (front-matter Material tokens vs. the prose slate/indigo values). The frontend uses the prose values (`#0F172A`, `#1E293B`, `#6366F1`, ...), which the component specs reference.
- Admin endpoints are disabled until `ADMIN_TOKEN` (16+ chars) is set. Serve over HTTPS in production.
