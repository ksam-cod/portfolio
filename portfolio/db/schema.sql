-- Portfolio schema (PostgreSQL 13+)
CREATE TABLE IF NOT EXISTS profile (
  id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- single-row table
  full_name     TEXT NOT NULL,
  headline      TEXT NOT NULL,
  bio           TEXT NOT NULL,
  location      TEXT,
  email         TEXT,
  phone         TEXT,
  github_url    TEXT,
  linkedin_url  TEXT,
  available     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE profile ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE TABLE IF NOT EXISTS projects (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL,
  image_url    TEXT,
  repo_url     TEXT,
  live_url     TEXT,
  tech         TEXT[] NOT NULL DEFAULT '{}',
  featured     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_order_idx ON projects (sort_order, id);

CREATE TABLE IF NOT EXISTS skills (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  category   TEXT NOT NULL DEFAULT 'General',
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS experience (
  id          SERIAL PRIMARY KEY,
  role        TEXT NOT NULL,
  company     TEXT NOT NULL,
  description TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE,                       -- NULL = current
  CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS experience_start_idx ON experience (start_date DESC);

CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email       TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_created_idx ON messages (created_at DESC);
