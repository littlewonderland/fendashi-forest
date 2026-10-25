// =========================================================
//   芬达石森林 · app.js
//   首页：分类筛选 / 排序 / 搜索 / 分页加载
//   =========================================================
const state = {
  posts: [],
  cats: [],
  sort: 'latest',
  query: '',
  cat: 'all',
  shown: 30,
};

const PAGE = 30;

function escape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function catNameOf(p) {
  if (!p) return '';
  if (p.cat === 'journal') return '手记';
  const c = state.cats.find(x => x.slug === p.cat);
  return c ? c.name : (p.theme || p.tags?.[0]) || '其他';
}

// ---- 搜索：标题 / 摘要 / 作者 / 主题 / 收藏夹 / 真实话题标签 ----
function haystack(p) {
  return [
    p.title, p.excerpt, p.author, p.folder, p.theme,
    ...(p.tags || []), ...(p.realTags || []),
  ].join(' ').toLowerCase();
}

// 暴露给 site.js：侧边栏搜索框直接驱动首页筛选
window.__homeSearch = function (q) {
  state.query = (q || '').trim().toLowerCase();
  state.shown = PAGE;
  draw();
};

// ---- 启动 ----
boot().catch(err => {
  console.error(err);
  const el = document.getElementById('postList');
  if (el) el.innerHTML = `<div class="empty">加载失败：${escape(String(err))}</div>`;
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
  const h = (location.hash || '').replace('#', '').replace(/^\//, '').trim();
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
  // 排序
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

  // 加载更多
  const more = document.getElementById('loadMore');
  if (more) {
    more.addEventListener('click', () => {
      state.shown += PAGE;
      draw();
    });
  }
}

function drawCatBar() {
  const bar = document.getElementById('catBar');
  if (!bar) return;
  const list = state.cats.slice();
  bar.innerHTML = list.map(c => {
    return `<button class="cat-chip${c.slug === 'all' ? ' is-active' : ''}" data-cat="${escape(c.slug)}"
      data-name="${escape(c.name)}">${escape(c.name)}<span class="cat-count">${c.count}</span></button>`;
  }).join('');

  bar.querySelectorAll('.cat-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.cat = btn.dataset.cat;
      state.shown = PAGE;
      bar.querySelectorAll('.cat-chip').forEach(x => x.classList.toggle('is-active', x === btn));
      history.replaceState(null, '', '#' + state.cat);
      draw();
    });
  });
}

function draw() {
  const heroEl = document.getElementById('postHero');
  const listEl = document.getElementById('postList');
  const labelEl = document.querySelector('.post-list-label');
  const moreEl = document.getElementById('loadMore');
  const countEl = document.getElementById('resultCount');
  if (!listEl) return;

  let list = state.posts.slice();

  if (state.cat && state.cat !== 'all') {
    list = list.filter(p => p.cat === state.cat);
  }

  if (state.query) {
    list = list.filter(p => haystack(p).includes(state.query));
  }

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

  // 首篇做 hero
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

function metaBlock(p) {
  return `<div class="post-meta">
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
      </div>`;
}

function renderHero(p) {
  return `
    <a class="post-hero" href="./${p.path}">
      <span class="post-hero-tag">${escape(catNameOf(p))}</span>
      <h2 class="post-title">${escape(p.title)}</h2>
      <p class="post-excerpt">${escape(p.excerpt || '')}</p>
      ${metaBlock(p)}
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
      ${metaBlock(p)}
    </a>
  `;
}
