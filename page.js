/* =========================================================
   芬达石森林 · page.js
   归档 / 标签 / 收藏夹 / 搜索 四个页面
   ========================================================= */
(function () {
  'use strict';

  var POSTS = null;      // posts[] 数组
  var BY_SLUG = {};      // slug -> post

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(d) { return (d || '').slice(0, 10); }

  function loadPosts() {
    if (POSTS) return Promise.resolve(POSTS);
    return fetch('posts.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        POSTS = d.posts || [];
        window.__CATS = d.categories || [];
        POSTS.forEach(function (p) { BY_SLUG[p.slug] = p; });
        return POSTS;
      });
  }

  function catNameOf(p, cats) {
    if (!p) return '';
    if (p.cat === 'journal') return '手记';
    var c = (cats || []).filter(function (x) { return x.slug === p.cat; })[0];
    return c ? c.name : (p.theme || '');
  }

  /* ================= 归档 ================= */
  function initArchive() {
    var root = document.getElementById('archiveRoot');
    if (!root) return;
    Promise.all([fetch('archive.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }), loadPosts()])
      .then(function (res) {
        var arc = res[0], posts = res[1];
        var cats = (window.__CATS || []);
        var total = arc.total || posts.length;
        var html = '<div class="archive-total">共 ' + total + ' 篇，' + arc.years.length + ' 年</div>';
        arc.years.forEach(function (y) {
          html += '<section class="archive-year">';
          html += '<h2 class="archive-year-title"><span class="archive-year-num">' + y.year + '</span>';
          html += '<span class="archive-year-count">' + y.count + ' 篇</span></h2>';
          y.months.forEach(function (m) {
            var mnum = parseInt(m.ym.slice(5), 10);
            html += '<details class="archive-month"' + (m.ym === arc.years[0].months[0].ym ? ' open' : '') + '>';
            html += '<summary class="archive-month-title"><span>' + mnum + ' 月</span>';
            html += '<span class="archive-month-count">' + m.count + ' 篇</span></summary>';
            html += '<ul class="archive-list">';
            m.slugs.forEach(function (s) {
              var p = BY_SLUG[s];
              if (!p) return;
              html += '<li><a href="' + p.path + '"><span class="archive-list-title">' + esc(p.title) + '</span>';
              html += '<span class="archive-list-meta">' + esc(catNameOf(p, cats)) + ' · ' + fmtDate(p.date) + '</span></a></li>';
            });
            html += '</ul></details>';
          });
          html += '</section>';
        });
        root.innerHTML = html;
      })
      .catch(function (e) { root.innerHTML = '<div class="empty">归档加载失败</div>'; });
  }

  /* ================= 标签 ================= */
  function initTags() {
    var cloud = document.getElementById('tagCloud');
    if (!cloud) return;
    var TAGS = null;
    fetch('tags.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (d) { TAGS = d.tags || []; return loadPosts(); })
      .then(function () {
        window.__TAGS = TAGS;
        renderTagCloud('');
        var h = location.hash || '';
        if (h.indexOf('#/tag/') === 0) showTag(decodeURIComponent(h.slice(6)));
      })
      .catch(function () { cloud.innerHTML = '<div class="empty">标签加载失败</div>'; });

    var input = document.getElementById('tagFilter');
    if (input) input.addEventListener('input', function () { renderTagCloud(input.value.trim()); });

    var close = document.getElementById('tagDetailClose');
    if (close) close.addEventListener('click', function () {
      document.getElementById('tagDetail').hidden = true;
      history.replaceState(null, '', location.pathname);
    });
  }

  function renderTagCloud(filter) {
    var cloud = document.getElementById('tagCloud');
    var countEl = document.getElementById('tagCount');
    var TAGS = window.__TAGS || [];
    var f = (filter || '').toLowerCase();
    var list = f ? TAGS.filter(function (t) { return t.tag.toLowerCase().indexOf(f) >= 0; }) : TAGS;
    var hot = list.filter(function (t) { return t.count >= 2; });
    var cold = list.filter(function (t) { return t.count < 2; });
    if (countEl) countEl.textContent = list.length + ' 个标签';

    if (!list.length) { cloud.innerHTML = '<div class="empty">没有匹配的标签</div>'; return; }

    var max = hot.length ? hot[0].count : 1;
    var min = hot.length ? hot[hot.length - 1].count : 1;
    var html = '';
    if (hot.length) {
      html += '<div class="tag-cloud-group">';
      hot.forEach(function (t) {
        var ratio = max === min ? 0.5 : (t.count - min) / (max - min);
        var size = (13 + ratio * 8).toFixed(1);
        var w = (1.6 + ratio * 0.5).toFixed(2);
        html += '<button class="tag-cloud-item" data-tag="' + esc(t.tag) + '" ' +
          'style="font-size:' + size + 'px;font-weight:' + w + ';">' + esc(t.tag) +
          '<span class="tag-cloud-n">' + t.count + '</span></button>';
      });
      html += '</div>';
    }
    if (cold.length) {
      html += '<details class="tag-cold"><summary>只出现一次的 ' + cold.length + ' 个标签</summary><div class="tag-cloud-group tag-cloud-cold">';
      cold.forEach(function (t) {
        html += '<button class="tag-cloud-item is-cold" data-tag="' + esc(t.tag) + '">' + esc(t.tag) + '</button>';
      });
      html += '</div></details>';
    }
    cloud.innerHTML = html;
    cloud.querySelectorAll('.tag-cloud-item').forEach(function (b) {
      b.addEventListener('click', function () { showTag(b.dataset.tag); });
    });
  }

  function showTag(tag) {
    var panel = document.getElementById('tagDetail');
    var listEl = document.getElementById('tagDetailList');
    var hits = POSTS.filter(function (p) {
      return (p.realTags || []).indexOf(tag) >= 0 ||
             (p.tags || []).indexOf(tag) >= 0;
    });
    document.getElementById('tagDetailName').textContent = '#' + tag;
    document.getElementById('tagDetailCount').textContent = hits.length + ' 篇';
    listEl.innerHTML = hits.length
      ? hits.map(function (p) {
          return '<a class="mini-post" href="' + p.path + '">' +
            '<span class="mini-post-title">' + esc(p.title) + '</span>' +
            '<span class="mini-post-meta">' + fmtDate(p.date) + ' · ' + esc(catNameOf(p, window.__CATS)) + '</span></a>';
        }).join('')
      : '<div class="empty">没有文章</div>';
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    history.replaceState(null, '', '#/tag/' + encodeURIComponent(tag));
  }

  /* ================= 收藏夹 ================= */
  function initFolders() {
    var grid = document.getElementById('folderGrid');
    if (!grid) return;
    loadPosts().then(function (posts) {
      var counts = {};
      posts.forEach(function (p) {
        var f = p.folder || '未归档';
        counts[f] = (counts[f] || 0) + 1;
      });
      var list = Object.keys(counts).map(function (k) { return { name: k, count: counts[k] }; })
        .sort(function (a, b) { return b.count - a.count; });
      grid.innerHTML = list.map(function (f) {
        return '<button class="folder-card" data-folder="' + esc(f.name) + '">' +
          '<span class="folder-name">' + esc(f.name) + '</span>' +
          '<span class="folder-count">' + f.count + '</span></button>';
      }).join('');
      grid.querySelectorAll('.folder-card').forEach(function (b) {
        b.addEventListener('click', function () { showFolder(b.dataset.folder); });
      });
      var h = location.hash || '';
      if (h.indexOf('#/folder/') === 0) showFolder(decodeURIComponent(h.slice(9)));
    }).catch(function () { grid.innerHTML = '<div class="empty">收藏夹加载失败</div>'; });

    var close = document.getElementById('folderDetailClose');
    if (close) close.addEventListener('click', function () {
      document.getElementById('folderDetail').hidden = true;
      history.replaceState(null, '', location.pathname);
    });
  }

  function showFolder(folder) {
    var panel = document.getElementById('folderDetail');
    var listEl = document.getElementById('folderDetailList');
    var hits = POSTS.filter(function (p) { return (p.folder || '未归档') === folder; });
    document.getElementById('folderDetailName').textContent = folder;
    document.getElementById('folderDetailCount').textContent = hits.length + ' 篇';
    listEl.innerHTML = hits.length
      ? hits.map(function (p) {
          return '<a class="mini-post" href="' + p.path + '">' +
            '<span class="mini-post-title">' + esc(p.title) + '</span>' +
            '<span class="mini-post-meta">' + fmtDate(p.date) + ' · ' + esc(catNameOf(p, window.__CATS)) + '</span></a>';
        }).join('')
      : '<div class="empty">没有文章</div>';
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    history.replaceState(null, '', '#/folder/' + encodeURIComponent(folder));
  }

  /* ================= 搜索 ================= */
  function initSearch() {
    var input = document.getElementById('qInput');
    var res = document.getElementById('searchResults');
    var countEl = document.getElementById('searchCount');
    if (!input || !res) return;
    var kind = 'all';

    loadPosts().then(function () {
      var q = new URLSearchParams(location.search).get('q');
      if (q) { input.value = q; run(); }
      else res.innerHTML = '<div class="empty">输入关键词开始搜索</div>';
    });

    function run() {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        res.innerHTML = '<div class="empty">输入关键词开始搜索</div>';
        if (countEl) countEl.textContent = '';
        return;
      }
      var hits = POSTS.filter(function (p) {
        var hay;
        if (kind === 'title') hay = [p.title];
        else if (kind === 'excerpt') hay = [p.excerpt];
        else if (kind === 'tag') hay = (p.realTags || []).concat(p.tags || []);
        else if (kind === 'author') hay = [p.author, p.theme, p.folder];
        else hay = [p.title, p.excerpt, p.author, p.theme, p.folder]
          .concat(p.realTags || [], p.tags || []);
        return hay.join(' ').toLowerCase().indexOf(q) >= 0;
      });
      if (countEl) countEl.textContent = hits.length + ' 篇';
      res.innerHTML = hits.length ? hits.map(function (p) {
        return '<a class="post-card" href="' + p.path + '">' +
          '<div class="post-card-top"><span class="post-card-cat">' + esc(catNameOf(p, window.__CATS)) + '</span>' +
          (p.type ? '<span class="post-card-type">' + esc(p.type) + '</span>' : '') + '</div>' +
          '<h3 class="post-title">' + esc(p.title) + '</h3>' +
          '<p class="post-excerpt">' + esc(p.excerpt || '') + '</p>' +
          '<div class="post-meta"><span>' + fmtDate(p.date) + '</span></div></a>';
      }).join('') : '<div class="empty">没找到匹配的笔记</div>';
    }

    input.addEventListener('input', run);
    var filters = document.getElementById('searchFilters');
    if (filters) filters.querySelectorAll('.search-filter').forEach(function (b) {
      b.addEventListener('click', function () {
        kind = b.dataset.kind;
        filters.querySelectorAll('.search-filter').forEach(function (x) {
          x.classList.toggle('is-active', x === b);
        });
        run();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initArchive();
    initTags();
    initFolders();
    initSearch();
  });
})();
