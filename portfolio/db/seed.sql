-- Profile and skills transcribed from the supplied MalConnect portfolio image.
INSERT INTO profile
  (id, full_name, headline, bio, location, email, phone, github_url, linkedin_url, available)
VALUES
  (1, 'MalConnect', 'Connecting ideas. Building solutions.',
   'I build powerful solutions through code, data, and creativity. I am a problem solver, detail-oriented, and always learning so I can deliver high-quality work.',
   'Nairobi, Kenya', 'samalexkariuki2@gmail.com', '+254706915713', NULL, NULL, TRUE)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  headline = EXCLUDED.headline,
  bio = EXCLUDED.bio,
  location = EXCLUDED.location,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  github_url = EXCLUDED.github_url,
  linkedin_url = EXCLUDED.linkedin_url,
  available = EXCLUDED.available,
  updated_at = now();

-- Remove only the starter demo skills; preserve skills managed through the API.
DELETE FROM skills WHERE name IN (
  'TypeScript', 'JavaScript', 'Python', 'Node.js', 'PostgreSQL',
  'REST APIs', 'React', 'CSS', 'Docker', 'Git'
);

INSERT INTO skills (name, category, sort_order) VALUES
  ('Problem Solving', 'Software Engineering', 1),
  ('Clean & Scalable Code', 'Software Engineering', 2),
  ('Data Structures & Algorithms', 'Software Engineering', 3),
  ('Software Design & Architecture', 'Software Engineering', 4),
  ('Testing & Debugging', 'Software Engineering', 5),
  ('Git & Version Control', 'Software Engineering', 6),
  ('Database Design', 'Database Management', 1),
  ('SQL & Query Optimization', 'Database Management', 2),
  ('Normalization', 'Database Management', 3),
  ('Data Modeling', 'Database Management', 4),
  ('Backup & Recovery', 'Database Management', 5),
  ('Performance Tuning', 'Database Management', 6),
  ('Data Collection', 'Data Analytics', 1),
  ('Data Cleaning', 'Data Analytics', 2),
  ('Exploratory Data Analysis', 'Data Analytics', 3),
  ('Data Visualization', 'Data Analytics', 4),
  ('Insights & Reporting', 'Data Analytics', 5),
  ('Python, Excel, Pandas, Matplotlib & Power BI', 'Data Analytics', 6),
  ('Responsive Frontend Development', 'Full Stack Web Development', 1),
  ('Robust Backend Development', 'Full Stack Web Development', 2),
  ('RESTful APIs', 'Full Stack Web Development', 3),
  ('Authentication & Security', 'Full Stack Web Development', 4),
  ('Deployment & Hosting', 'Full Stack Web Development', 5),
  ('Cross-Platform Solutions', 'Application Development', 1),
  ('User-Centered Design', 'Application Development', 2),
  ('Performance & Scalability', 'Application Development', 3),
  ('Flutter, React Native, Java & Kotlin', 'Application Development', 4),
  ('Photo Editing', 'Photoshop Design', 1),
  ('Graphic Design', 'Photoshop Design', 2),
  ('UI/UX Mockups', 'Photoshop Design', 3),
  ('Banners & Thumbnails', 'Photoshop Design', 4),
  ('Social Media Graphics', 'Photoshop Design', 5),
  ('Creative & Professional Visuals', 'Photoshop Design', 6),
  ('HTML5', 'Tools & Technologies', 1),
  ('CSS3', 'Tools & Technologies', 2),
  ('JavaScript', 'Tools & Technologies', 3),
  ('React', 'Tools & Technologies', 4),
  ('Node.js', 'Tools & Technologies', 5),
  ('Python', 'Tools & Technologies', 6),
  ('PostgreSQL', 'Tools & Technologies', 7),
  ('MongoDB', 'Tools & Technologies', 8),
  ('Git', 'Tools & Technologies', 9),
  ('Docker', 'Tools & Technologies', 10),
  ('Power BI', 'Tools & Technologies', 11)
ON CONFLICT (name) DO UPDATE SET
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- Remove only the demo entries shipped with the starter seed; do not affect real records.
DELETE FROM projects WHERE title IN ('Inventory Pulse', 'Trail Notes', 'Ledger CLI');
DELETE FROM experience
WHERE (role, company) IN (
  ('Senior Software Engineer', 'Acme Labs'),
  ('Software Engineer', 'Brightside Co.')
);
