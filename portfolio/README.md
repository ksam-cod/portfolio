# MalConnect Portfolio

Express + PostgreSQL backend serving the MalConnect portfolio frontend.

## Run it locally on Windows

Requirements: Node.js 20.6+ and PostgreSQL 13+. Create a database named `portfolio` in pgAdmin (or with `createdb` if PostgreSQL's command-line tools are on your PATH).

From PowerShell, open the project directory and run:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set `DATABASE_URL` to your local PostgreSQL connection string, for example `postgres://postgres:YOUR_PASSWORD@localhost:5432/portfolio`. If the password contains URL-reserved characters, URL-encode them. Set `ADMIN_TOKEN` to a private random value of at least 16 characters; for example, generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Then install dependencies, create the tables and sample records, and start the server:

```powershell
npm install
npm run seed
npm start
```

Open `http://localhost:3000` in your browser. Do not open `public\index.html` directly: the Express server serves the frontend and its `/api/...` routes from the same origin, so no separate frontend server or CORS setup is needed. Check the backend/database connection at `http://localhost:3000/api/health`; a healthy response is `{"ok":true}`.

In VS Code, you can also run the **Portfolio: Run locally** task from the Command Palette (`Tasks: Run Task`). Enter the PostgreSQL password in the integrated terminal when prompted; it is hidden while typing. The task verifies the connection, updates the local `.env` URL with URL-encoded credentials, seeds the database, and starts the site.

To publish a project, open **Add a project** below the Projects section on the site, enter the `ADMIN_TOKEN` from `.env`, fill in the project details, and select **Publish project**. Add a live URL to show a link to the running project. The token is used for the request and is not stored in the browser.

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

- Admin endpoints are disabled until `ADMIN_TOKEN` (16+ chars) is set. Serve over HTTPS in production.
