// === shared state ===
const state = {
  posts: [],
  sort: 'latest',
  query: '',
};

const TAG_LABELS = {
  tools: '工具',
  projects: '项目',
  notes: '笔记',
  life: '生活',
  skills: '技能',
};

// === boot ===
boot().catch(err => {
  console.error(err);
  const el = document.getElementById('postList');
  if (el) el.innerHTML = `<div class="empty">加载失败：${String(err)}</div>`;
});

async function boot() {
  const res = await fetch('posts.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  state.posts = data.posts || [];
  bindUI();
  draw();
}

function bindUI() {
  // tabs
  document.querySelectorAll('#tabs .tab').forEach(t => {
    t.addEventListener('click', () => {
      state.sort = t.dataset.sort;
      document.querySelectorAll('#tabs .tab').forEach(x => {
        x.classList.toggle('is-active', x === t);
      });
      draw();
    });
  });

  // search
  const search = document.getElementById('searchInput');
  if (search) {
    search.addEventListener('input', () => {
      state.query = search.value.trim().toLowerCase();
      draw();
    });
  }

  // dark mode toggle
  const darkBtn = document.getElementById('darkBtn');
  const themeBtn = document.getElementById('themeBtn');
  const darkBtnMobile = document.getElementById('themeBtnMobile');
  const saved = localStorage.getItem('fendashi-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const toggle = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('fendashi-theme', next);
  };
  if (darkBtn) darkBtn.addEventListener('click', toggle);
  if (themeBtn) themeBtn.addEventListener('click', toggle);
  if (darkBtnMobile) darkBtnMobile.addEventListener('click', toggle);
}

function draw() {
  const heroEl = document.getElementById('postHero');
  const listEl = document.getElementById('postList');
  const labelEl = document.querySelector('.post-list-label');
  if (!listEl) return;

  let list = state.posts.slice();

  // search filter
  if (state.query) {
    list = list.filter(p => {
      const hay = [p.title, p.excerpt, ...(p.tags || []), ...(p.tags || []).map(t => TAG_LABELS[t] || '')]
        .join(' ').toLowerCase();
      return hay.includes(state.query);
    });
  }

  // sort
  if (state.sort === 'hot') {
    list.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (state.sort === 'comments') {
    list.sort((a, b) => (b.comments || 0) - (a.comments || 0));
  } else {
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  if (list.length === 0) {
    if (heroEl) heroEl.innerHTML = '';
    if (labelEl) labelEl.style.display = 'none';
    listEl.innerHTML = `<div class="empty">${state.query ? '没找到匹配的种子' : '这个分类还空着'}</div>`;
    return;
  }

  // first item = hero (only when no active search)
  if (heroEl) {
    if (state.query || list.length === 1) {
      heroEl.innerHTML = '';
    } else {
      heroEl.innerHTML = renderHero(list[0]);
      list = list.slice(1);
    }
  }
  if (labelEl) labelEl.style.display = list.length > 0 ? 'flex' : 'none';

  listEl.innerHTML = list.map(renderCard).join('');
}

function renderHero(p) {
  const primaryTag = (p.tags || [])[0] || 'notes';
  return `
    <a class="post-hero" href="./posts/${p.slug}.html">
      <span class="post-hero-tag">${escape(TAG_LABELS[primaryTag] || primaryTag)}</span>
      <h2 class="post-title">${escape(p.title)}</h2>
      <p class="post-excerpt">${escape(p.excerpt || '')}</p>
      <div class="post-meta">
        <span>${escape((p.date || '').slice(0, 10))}</span>
        <span class="sep">·</span>
        <span class="post-meta-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          ${p.views || 0}
        </span>
        <span class="sep">·</span>
        <span class="post-meta-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          ${p.comments || 0}
        </span>
      </div>
    </a>
  `;
}

function renderCard(p) {
  return `
    <a class="post-card" href="./posts/${p.slug}.html">
      <h3 class="post-title">${escape(p.title)}</h3>
      <p class="post-excerpt">${escape(p.excerpt || '')}</p>
      <div class="post-meta">
        <span>${escape((p.date || '').slice(0, 10))}</span>
        <span class="sep">·</span>
        <span class="post-meta-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          ${p.views || 0}
        </span>
        <span class="sep">·</span>
        <span class="post-meta-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          ${p.comments || 0}
        </span>
      </div>
    </a>
  `;
}

function escape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}