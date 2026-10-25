/* =========================================================
   芬达石森林 · post.js
   文章页增强：目录 / 上下篇 / 相关推荐 / 分享 / 阅读进度 / 评论
   ========================================================= */
(function () {
  'use strict';

  var POSTS = null;
  var BY_SLUG = {};
  var SLUG = document.body.getAttribute('data-slug');
  var CATS = [];
  var BASE = document.body.getAttribute('data-base') || '';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtDate(d) { return (d || '').slice(0, 10); }
  function catNameOf(p) {
    if (!p) return '';
    if (p.cat === 'journal') return '手记';
    var c = CATS.filter(function (x) { return x.slug === p.cat; })[0];
    return c ? c.name : (p.theme || '');
  }

  function loadPosts() {
    if (POSTS) return Promise.resolve(POSTS);
    return fetch(BASE + 'posts.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        POSTS = d.posts || [];
        CATS = d.categories || [];
        POSTS.forEach(function (p) { BY_SLUG[p.slug] = p; });
        return POSTS;
      });
  }

  /* ================= 目录 ================= */
  function buildToc() {
    var wrap = document.getElementById('postToc');
    var content = document.querySelector('.post-content');
    if (!wrap || !content) return;
    var heads = content.querySelectorAll('h2');
    if (heads.length < 1) { wrap.hidden = true; return; }
    var items = [];
    heads.forEach(function (h, i) {
      var id = 'sec-' + (i + 1);
      h.id = id;
      items.push('<a class="toc-item" href="#' + id + '">' + esc(h.textContent) + '</a>');
    });
    wrap.innerHTML = '<span class="toc-label">本文目录</span>' + items.join('');
    wrap.hidden = false;

    // 滚动高亮
    var links = wrap.querySelectorAll('.toc-item');
    function onScroll() {
      var top = window.scrollY + 140;
      var cur = 0;
      heads.forEach(function (h, i) { if (h.offsetTop <= top) cur = i; });
      links.forEach(function (a, i) { a.classList.toggle('is-active', i === cur); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ================= 上下篇 ================= */
  function buildPrevNext() {
    var el = document.getElementById('postNav');
    if (!el) return;
    var idx = POSTS.findIndex(function (p) { return p.slug === SLUG; });
    if (idx < 0) { el.hidden = true; return; }
    var older = POSTS[idx + 1];   // 更早
    var newer = POSTS[idx - 1];   // 更新
    var html = '';
    if (older) {
      html += '<a class="post-nav-item is-prev" href="' + older.path + '">' +
        '<span class="post-nav-label">← 上一篇</span>' +
        '<span class="post-nav-title">' + esc(older.title) + '</span></a>';
    } else {
      html += '<span class="post-nav-item is-empty"></span>';
    }
    if (newer) {
      html += '<a class="post-nav-item is-next" href="' + newer.path + '">' +
        '<span class="post-nav-label">下一篇 →</span>' +
        '<span class="post-nav-title">' + esc(newer.title) + '</span></a>';
    }
    el.innerHTML = html;
    el.hidden = false;
  }

  /* ================= 相关推荐 ================= */
  function buildRelated() {
    var el = document.getElementById('postRelated');
    if (!el) return;
    var self = BY_SLUG[SLUG];
    if (!self) { el.hidden = true; return; }
    var selfTags = self.realTags || [];
    var scored = POSTS.filter(function (p) { return p.slug !== SLUG; }).map(function (p) {
      var score = 0;
      if (p.cat === self.cat) score += 3;
      if (p.folder === self.folder) score += 1.5;
      var shared = (p.realTags || []).filter(function (t) { return selfTags.indexOf(t) >= 0; });
      score += shared.length * 1.2;
      if (p.kind === self.kind) score += 0.3;
      return { p: p, score: score };
    }).filter(function (x) { return x.score > 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, 4);
    if (!scored.length) { el.hidden = true; return; }
    el.innerHTML = '<h2 class="section-title">相关推荐</h2><div class="related-grid">' +
      scored.map(function (x) {
        var p = x.p;
        return '<a class="related-card" href="' + p.path + '">' +
          '<span class="related-cat">' + esc(catNameOf(p)) + '</span>' +
          '<span class="related-title">' + esc(p.title) + '</span>' +
          '<span class="related-meta">' + fmtDate(p.date) + '</span></a>';
      }).join('') + '</div>';
    el.hidden = false;
  }

  /* ================= 分享 ================= */
  function buildShare() {
    var el = document.getElementById('postShare');
    if (!el) return;
    var url = location.href;
    var title = (document.querySelector('.post-page-title') || {}).textContent || '';
    el.innerHTML =
      '<span class="share-label">分享</span>' +
      '<button class="share-btn" data-share="copy" title="复制链接">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>' +
      '<a class="share-btn" data-share="weibo" target="_blank" rel="noopener noreferrer" title="分享到微博">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10.1 20.3c-4.3 0-8.1-1.9-8.1-4.9 0-1.4.8-3 2.2-4.2 1.9-1.6 4.2-2.3 5.1-1.4.4.4.5 1 .3 1.7-.1.3-.3.6-.5.9 1.3-.1 2.6.4 3.5 1.3.8.8 1.1 1.8.9 2.8-.5 2.5-2.4 3.8-4.4 3.8zM3.7 15c0 1.3 1.5 2.2 3.2 2.2 1.6 0 2.7-.8 2.6-1.8-.1-.9-1.1-1.6-2.4-1.6-1.4 0-2.6.7-2.6 1.6-.5-.1-.8-.2-.8-.4zm5-1.9c.3-.2.7-.2.9 0 .2.2.2.5 0 .7-.2.2-.6.2-.8 0-.2-.2-.2-.5-.1-.7z"/>' +
      '<path d="M20 11.2c-.4 0-.7 0-1 .1.5-1.5.3-2.6-.4-3.4-.8-.9-2.3-1-4.2-.2-.1.1-.2.1-.3.2.1-1.4-.2-2.4-1-3-.9-.7-2.3-.5-3.5.4-1 1-1.4 2.5-1.1 3.9 0 0 .6-1.6 2-2.7-2 .4-3.7 1.5-4.2 3-.3 1 .1 2 .9 2.7.7.6 1.7.9 2.7.7-.5.5-1.1.8-1.8 1 .7 1.2 2 1.9 3.3 1.9 2.2 0 4-1.8 4-4 0-.2 0-.3 0-.5 1.3.9 2.5 1.6 2.5 1.6z"/></svg></a>' +
      '<a class="share-btn" data-share="x" target="_blank" rel="noopener noreferrer" title="分享到 X">' +
      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 2H21l-6.6 7.5L22 22h-6l-4.7-6.1L5.9 22H3l7-8L2 2h6.2l4.2 5.6L18.2 2zm-1 18h1.6L6.9 3.9H5.2L17.2 20z"/></svg></a>';

    el.querySelectorAll('[data-share]').forEach(function (b) {
      var kind = b.getAttribute('data-share');
      if (kind === 'copy') {
        b.addEventListener('click', function () {
          copyText(url);
          b.classList.add('is-done');
          setTimeout(function () { b.classList.remove('is-done'); }, 1500);
        });
      } else if (kind === 'weibo') {
        b.href = 'https://service.weibo.com/share/share.php?url=' + encodeURIComponent(url) +
          '&title=' + encodeURIComponent(title);
      } else if (kind === 'x') {
        b.href = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) +
          '&text=' + encodeURIComponent(title);
      }
    });
  }

  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).catch(function () { fallbackCopy(t); });
    } else fallbackCopy(t);
  }
  function fallbackCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ================= 阅读进度 ================= */
  function buildProgress() {
    var bar = document.getElementById('readProgress');
    if (!bar) return;
    function onScroll() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? (window.scrollY / h) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, p)) + '%';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ================= 评论（Giscus） ================= */
  function mountComments() {
    var box = document.getElementById('postComments');
    if (!box) return;
    var cfg = window.FENDASHI_GISCUS;
    if (!cfg || cfg.enabled === false) { box.hidden = true; return; }
    var s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.setAttribute('data-repo', cfg.repo);
    s.setAttribute('data-repo-id', cfg.repoId);
    s.setAttribute('data-category', cfg.category);
    s.setAttribute('data-category-id', cfg.categoryId);
    s.setAttribute('data-mapping', 'pathname');
    s.setAttribute('data-strict', '0');
    s.setAttribute('data-reactions-enabled', '1');
    s.setAttribute('data-emit-metadata', '0');
    s.setAttribute('data-input-position', 'top');
    s.setAttribute('data-theme', 'light');
    s.setAttribute('data-lang', 'zh-CN');
    s.setAttribute('data-loading', 'lazy');
    box.appendChild(s);
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildToc();
    buildProgress();
    buildShare();
    mountComments();
    loadPosts().then(function () {
      buildPrevNext();
      buildRelated();
    }).catch(function () {});
  });
})();
