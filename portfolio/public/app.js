'use strict';
(function () {
  const $ = (id) => document.getElementById(id);

  // Safe element builder: only ever uses textContent / setAttribute, never innerHTML.
  function el(tag, props, children) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null) continue;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else n.setAttribute(k, v);
    }
    (children || []).forEach((c) => c && n.appendChild(c));
    return n;
  }
  const isHttp = (u) => typeof u === 'string' && /^https?:\/\//i.test(u);
  const getJSON = (url) => fetch(url).then((r) => { if (!r.ok) throw new Error(url); return r.json(); });
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Present';
  const empty = (msg) => el('p', { class: 'muted', text: msg });

  function pills(items) { return items.map((t) => el('span', { class: 'pill', text: t })); }

  function renderProfile(p) {
    if (!p) { $('name').textContent = 'Portfolio'; return; }
    document.title = p.full_name;
    $('name').textContent = p.full_name;
    $('headline').textContent = p.headline;
    $('bio').textContent = p.bio;
    $('status').hidden = !p.available;
    if (p.email) {
      $('contact-email').href = `mailto:${p.email}`;
      $('contact-email').textContent = p.email;
    }
    if (p.phone) {
      $('contact-phone').href = `tel:${p.phone.replace(/[^\d+]/g, '')}`;
      $('contact-phone').textContent = `Tel: ${p.phone}`;
    }
    if (isHttp(p.github_url)) { $('github').href = p.github_url; $('github').hidden = false; }
    if (isHttp(p.linkedin_url)) { $('linkedin').href = p.linkedin_url; $('linkedin').hidden = false; }
  }

  function renderSkills(rows) {
    const box = $('skills-list');
    if (!rows.length) return box.replaceChildren(empty('Nothing here yet.'));
    const groups = new Map();
    rows.forEach((skill) => {
      const category = skill.category || 'Other';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(skill.name);
    });
    box.replaceChildren(...[...groups].map(([category, skills]) =>
      el('article', { class: `skill-card${category === 'Tools & Technologies' ? ' skill-card-tools' : ''}` }, [
        el('h3', { text: category }),
        el('ul', {}, skills.map((name) => el('li', { text: name }))),
      ])
    ));
  }

  function renderProjects(rows) {
    const box = $('projects-list');
    if (!rows.length) return box.replaceChildren(empty('No projects yet.'));
    box.replaceChildren(...rows.map((p) => {
      const links = [];
      if (isHttp(p.live_url)) links.push(el('a', { href: p.live_url, target: '_blank', rel: 'noopener noreferrer', text: 'Live site' }));
      if (isHttp(p.repo_url)) links.push(el('a', { href: p.repo_url, target: '_blank', rel: 'noopener noreferrer', text: 'Source' }));
      return el('article', { class: 'card' }, [
        isHttp(p.image_url) ? el('img', { class: 'media', src: p.image_url, alt: '', loading: 'lazy' }) : null,
        p.featured ? el('span', { class: 'tag', text: 'Featured' }) : null,
        el('h3', { text: p.title }),
        el('p', { text: p.summary }),
        p.tech && p.tech.length ? el('div', { class: 'pills' }, pills(p.tech)) : null,
        links.length ? el('div', { class: 'links' }, links) : null,
      ]);
    }));
  }

  function loadProjects() {
    return getJSON('/api/projects').then(renderProjects);
  }

  function renderExperience(rows) {
    const box = $('exp-list');
    if (!rows.length) return box.replaceChildren(empty('No experience listed yet.'));
    box.replaceChildren(...rows.map((x) => el('li', { class: x.end_date ? '' : 'current' }, [
      el('h3', { text: x.role }),
      el('span', { class: 'when', text: `${x.company} · ${fmt(x.start_date)} – ${fmt(x.end_date)}` }),
      x.description ? el('p', { text: x.description }) : null,
    ])));
  }

  // Load everything independently so one failure doesn't blank the page
  getJSON('/api/profile').then(renderProfile).catch(() => renderProfile(null));
  getJSON('/api/skills').then(renderSkills).catch(() => $('skills-list').replaceChildren(empty('Could not load skills.')));
  loadProjects().catch(() => $('projects-list').replaceChildren(empty('Could not load projects.')));
  getJSON('/api/experience').then(renderExperience).catch(() => $('exp-list').replaceChildren(empty('Could not load experience.')));

  // Contact form
  const form = $('contact-form');
  const msg = $('form-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    const data = Object.fromEntries(new FormData(form));
    msg.className = 'form-msg';
    msg.textContent = '';
    if (!data.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) || !data.body.trim()) {
      msg.classList.add('err');
      msg.textContent = 'Please fill in your name, a valid email and a message.';
      return;
    }
    btn.disabled = true;
    try {
      const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'Something went wrong');
      form.reset();
      msg.classList.add('ok');
      msg.textContent = 'Thanks! Your message was sent.';
    } catch (err) {
      msg.classList.add('err');
      msg.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  // Project publishing uses the admin token only for this request; it is not saved.
  const projectForm = $('project-form');
  const projectMsg = $('project-form-msg');
  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!projectForm.reportValidity()) return;
    const btn = projectForm.querySelector('button');
    const data = new FormData(projectForm);
    const token = data.get('admin_token').trim();
    const project = {
      title: data.get('title').trim(),
      summary: data.get('summary').trim(),
      tech: data.get('tech').split(',').map((item) => item.trim()).filter(Boolean),
      image_url: data.get('image_url').trim() || null,
      live_url: data.get('live_url').trim() || null,
      repo_url: data.get('repo_url').trim() || null,
      featured: data.has('featured'),
      sort_order: Number(data.get('sort_order')) || 0,
    };
    projectMsg.className = 'form-msg';
    projectMsg.textContent = '';
    btn.disabled = true;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(project),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || 'Could not publish this project');
      projectForm.reset();
      projectMsg.classList.add('ok');
      projectMsg.textContent = 'Project published and added to the showcase.';
      await loadProjects();
    } catch (err) {
      projectMsg.classList.add('err');
      projectMsg.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
})();
