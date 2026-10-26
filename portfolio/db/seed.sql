-- Sample content. Replace with your own via the admin API or by editing this file.
INSERT INTO profile (id, full_name, headline, bio, location, email, github_url, linkedin_url, available)
VALUES (1, 'Your Name', 'Software engineer building precise, human-centred products',
  'I design and build web and mobile software end to end, from database schema to pixel-level interface details.',
  'Nairobi, Kenya', 'you@example.com', 'https://github.com/', 'https://linkedin.com/', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO skills (name, category, sort_order) VALUES
  ('TypeScript','Languages',1), ('JavaScript','Languages',2), ('Python','Languages',3),
  ('Node.js','Backend',4), ('PostgreSQL','Backend',5), ('REST APIs','Backend',6),
  ('React','Frontend',7), ('CSS','Frontend',8), ('Docker','Tooling',9), ('Git','Tooling',10)
ON CONFLICT (name) DO NOTHING;

INSERT INTO projects (title, summary, repo_url, live_url, tech, featured, sort_order)
SELECT * FROM (VALUES
  ('Inventory Pulse', 'Real-time stock tracking dashboard for small retailers with low-stock alerts.', 'https://github.com/', NULL, ARRAY['Node.js','PostgreSQL','React'], TRUE, 1),
  ('Trail Notes', 'Offline-first mobile notes app for hikers, with GPS-tagged entries.', 'https://github.com/', NULL, ARRAY['TypeScript','SQLite'], TRUE, 2),
  ('Ledger CLI', 'Command-line double-entry bookkeeping tool with CSV import.', 'https://github.com/', NULL, ARRAY['Python'], FALSE, 3)
) AS v(title, summary, repo_url, live_url, tech, featured, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM projects);

INSERT INTO experience (role, company, description, start_date, end_date)
SELECT * FROM (VALUES
  ('Senior Software Engineer', 'Acme Labs', 'Lead a team of four shipping a payments platform.', DATE '2023-03-01', NULL::date),
  ('Software Engineer', 'Brightside Co.', 'Built internal tooling and REST services in Node.js.', DATE '2020-06-01', DATE '2023-02-28')
) AS v(role, company, description, start_date, end_date)
WHERE NOT EXISTS (SELECT 1 FROM experience);
