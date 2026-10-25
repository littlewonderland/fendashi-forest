// === shared state ===
const state = {
  posts: [],
  cats: [],
  sort: 'latest',
  query: '',
  cat: 'all',
  shown: 30,
};

const TAG_LABELS = {
  tools: '工具',
  projects: '项目',
  notes: '笔记',
  life: '生活',
  skills: '技能',
};

// 分类顺序（跟 posts.json 一致，但按数量排更好读 —— 这里按预设）
const CAT_ORDER = [
  'all', '职场成长', '健身健康', '自我成长', '影音剪辑', '理财消费', '生活杂项',
  '缝纫手作', '旅行户外', '游戏娱乐', '居住家装', '语言学习', '饮食营养',
  '情感关系', '萌宠动物', 'journal',
];

const PAGE = 30;

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
  state.cats = data.categories || [];
  bindUI();
  drawCatBar();
  applyHash();
  draw();
  window.addEventListener('hashchange', () => { applyHash(); draw(); });
}

// 从 URL hash 直接选中分类（分类索引页跳过来用）
function applyHash() {
  const h = (location.hash || '').replace('#', '').trim();
  if (!h) return;
  const c = state.cats.find(x => x.slug === h);
  if (!c) return;
  state.cat = c.slug;
  state.shown = PAGE;
  const bar = document.getElementById('catBar');
  if (bar) {
    bar.querySelectorAll('.cat-chip').forEach(x => {
      x.classList.toggle('is-active', x.dataset.cat === c.slug);
    });
  }
}

function bindUI() {
  // tabs
  document.querySelectorAll('#tabs .tab').forEach(t => {
    t.addEventListener('click', () => {
      state.sort = t.dataset.sort;
      document.querySelectorAll('#tabs .tab').forEach(x => {
        x.classList.toggle('is-active', x === t);
      });
      state.shown = PAGE;
      draw();
    });
  });

  // search
  const search = document.getElementById('searchInput');
  if (search) {
    search.addEventListener('input', () => {
      state.query = search.value.trim().toLowerCase();
      state.shown = PAGE;
      draw();
    });
  }

  // load more
  const more = document.getElementById('loadMore');
  if (more) {
    more.addEventListener('click', () => {
      state.shown += PAGE;
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

function drawCatBar() {
  const bar = document.getElementById('catBar');
  if (!bar) return;
  const map = {};
  state.cats.forEach(c => { map[c.name] = c; });
  const order = CAT_ORDER.filter(n => map[n]);
  // 补上 posts.json 里新增但不在预设里的
  state.cats.forEach(c => { if (!order.includes(c.name)) order.push(c.name); });

  bar.innerHTML = order.map(name => {
    const c = map[name];
    const slug = c.slug === 'all' ? 'all' : (c.slug === 'journal' ? 'journal' : c.slug);
    return `<button class="cat-chip${name === 'all' ? ' is-active' : ''}" data-cat="${slug}"
      data-name="${name}">${escape(name)}<span class="cat-count">${c.count}</span></button>`;
  }).join('');

  bar.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.cat = btn.dataset.cat;
      state.shown = PAGE;
      bar.querySelectorAll('.cat-chip').forEach(x => x.classList.toggle('is-active', x === btn));
      draw();
    });
  });
}

function catNameOf(p) {
  if (p.cat === 'journal') return '手记';
  const c = state.cats.find(x => x.slug === p.cat);
  return c ? c.name : (p.tags && p.tags[0]) || '其他';
}

function draw() {
  const heroEl = document.getElementById('postHero');
  const listEl = document.getElementById('postList');
  const labelEl = document.querySelector('.post-list-label');
  const moreEl = document.getElementById('loadMore');
  const countEl = document.getElementById('resultCount');
  if (!listEl) return;

  let list = state.posts.slice();

  // 分类筛选
  if (state.cat && state.cat !== 'all') {
    list = list.filter(p => p.cat === state.cat);
  }

  // 搜索
  if (state.query) {
    list = list.filter(p => {
      const hay = [p.title, p.excerpt, p.author, p.folder, p.theme,
        ...(p.tags || []), ...(p.tags || []).map(t => TAG_LABELS[t] || t)].join(' ').toLowerCase();
      return hay.includes(state.query);
    });
  }

  // 排序
  if (state.sort === 'hot') {
    list.sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (state.sort === 'comments') {
    list.sort((a, b) => (b.comments || 0) - (a.comments || 0));
  } else {
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }

  const total = list.length;
  if (countEl) countEl.textContent = total ? `${total} 篇` : '';

  if (total === 0) {
    if (heroEl) heroEl.innerHTML = '';
    if (labelEl) labelEl.style.display = 'none';
    if (moreEl) moreEl.style.display = 'none';
    listEl.innerHTML = `<div class="empty">${state.query ? '没找到匹配的笔记' : '这个分类还空着'}</div>`;
    return;
  }

  // hero（只在无搜索 + 有内容时）
  if (heroEl) {
    if (state.query || total === 1) {
      heroEl.innerHTML = '';
    } else {
      heroEl.innerHTML = renderHero(list[0]);
      list = list.slice(1);
    }
  }

  const page = list.slice(0, state.shown);
  if (labelEl) labelEl.style.display = page.length > 0 ? 'flex' : 'none';
  listEl.innerHTML = page.map(renderCard).join('');
  if (moreEl) moreEl.style.display = (state.shown < list.length) ? '' : 'none';
}

function renderHero(p) {
  return `
    <a class="post-hero" href="./${p.path}">
      <span class="post-hero-tag">${escape(catNameOf(p))}</span>
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
    <a class="post-card" href="./${p.path}">
      <div class="post-card-top">
        <span class="post-card-cat">${escape(catNameOf(p))}</span>
        ${p.type ? `<span class="post-card-type">${escape(p.type)}</span>` : ''}
      </div>
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
