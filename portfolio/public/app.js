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
    if (isHttp(p.github_url)) { $('github').href = p.github_url; $('github').hidden = false; }
    if (isHttp(p.linkedin_url)) { $('linkedin').href = p.linkedin_url; $('linkedin').hidden = false; }
  }

  function renderSkills(rows) {
    const box = $('skills-list');
    if (!rows.length) return box.replaceChildren(empty('Nothing here yet.'));
    box.replaceChildren(...pills(rows.map((s) => s.name)));
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
  getJSON('/api/projects').then(renderProjects).catch(() => $('projects-list').replaceChildren(empty('Could not load projects.')));
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

  // Dock: highlight the section in view
  const links = [...document.querySelectorAll('.dock a')];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.dataset.target === en.target.id));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  links.forEach((a) => { const s = $(a.dataset.target); if (s) io.observe(s); });
})();
