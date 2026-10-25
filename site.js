/* =========================================================
   芬达石森林 · site.js
   全站通用：主题、菜单、搜索跳转、统计、回到顶部、快捷键
   ========================================================= */
(function () {
  'use strict';

  var THEME_KEY = 'fendashi-theme';
  var IS_POST = document.body.getAttribute('data-page') === 'post';
  var BASE = document.body.getAttribute('data-base') || '';

  /* ---------- 主题 ---------- */
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    document.querySelectorAll('[data-theme-icon]').forEach(function (b) {
      b.innerHTML = t === 'dark' ? SUN_ICON : MOON_ICON;
    });
  }
  function toggleTheme() { setTheme(currentTheme() === 'dark' ? 'light' : 'dark'); }

  var MOON_ICON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  var SUN_ICON = '<circle cx="12" cy="12" r="4.5"/><path d="M12 1.5v2M12 20.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1.5 12h2M20.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';

  document.addEventListener('DOMContentLoaded', function () {
    // 主题按钮
    var themeBtn = document.getElementById('themeBtn');
    var themeBtnMobile = document.getElementById('themeBtnMobile');
    if (themeBtn) {
      themeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-theme-icon>' + (currentTheme() === 'dark' ? SUN_ICON : MOON_ICON) + '</svg>';
      themeBtn.addEventListener('click', toggleTheme);
    }
    if (themeBtnMobile) themeBtnMobile.addEventListener('click', toggleTheme);

    /* ---------- 移动端菜单抽屉 ---------- */
    var menuBtn = document.getElementById('menuBtn');
    var drawer = document.getElementById('navDrawer');
    if (menuBtn && drawer) {
      menuBtn.addEventListener('click', function () {
        var open = drawer.classList.toggle('is-open');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('drawer-open', open);
      });
      drawer.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') {
          drawer.classList.remove('is-open');
          document.body.classList.remove('drawer-open');
          menuBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    /* ---------- 侧边栏搜索：首页本地筛，其余跳搜索页 ---------- */
    var sideSearch = document.getElementById('searchInput');
    if (sideSearch) {
      sideSearch.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var q = sideSearch.value.trim();
        var onHome = /index\.html?$/.test(location.pathname) || location.pathname.endsWith('/');
        if (onHome && typeof window.__homeSearch === 'function') {
          window.__homeSearch(q);
        } else if (q) {
          location.href = 'search.html?q=' + encodeURIComponent(q);
        }
      });
      sideSearch.addEventListener('input', function () {
        var onHome = /index\.html?$/.test(location.pathname) || location.pathname.endsWith('/');
        if (onHome && typeof window.__homeSearch === 'function') {
          window.__homeSearch(sideSearch.value.trim());
        }
      });
    }

    /* ---------- 站点统计 ---------- */
    loadStats();

    /* ---------- 回到顶部 ---------- */
    setupBackToTop();

    /* ---------- 快捷键 ---------- */
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !isTyping(e.target)) {
        e.preventDefault();
        var s = document.getElementById('qInput') || document.getElementById('searchInput');
        if (s) { s.focus(); s.select(); }
        else location.href = 'search.html';
      }
      if (e.key === 'Escape') {
        var s2 = document.getElementById('qInput');
        if (s2 && s2.value) { s2.value = ''; s2.dispatchEvent(new Event('input')); }
        closeAllPanels();
      }
    });
  });

  function isTyping(el) {
    if (!el) return false;
    var t = (el.tagName || '').toLowerCase();
    return t === 'input' || t === 'textarea' || el.isContentEditable;
  }

  function closeAllPanels() {
    var d = document.getElementById('navDrawer');
    if (d) d.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
  }

  /* ---------- 统计 ---------- */
  function loadStats() {
    var el = document.getElementById('siteStats');
    if (!el) return;
    fetch(BASE + 'site-stats.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (st) {
        if (!st) return;
        el.innerHTML =
          '<div><strong>' + st.posts + '</strong>篇</div>' +
          '<div><strong>' + st.topics + '</strong>话题</div>' +
          '<div><strong>' + st.years_span + '</strong>年</div>';
      })
      .catch(function () {});
  }

  /* ---------- 回到顶部 ---------- */
  function setupBackToTop() {
    if (document.getElementById('backTop')) return;
    var btn = document.createElement('button');
    btn.id = 'backTop';
    btn.className = 'back-top';
    btn.setAttribute('aria-label', '回到顶部');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
    document.body.appendChild(btn);
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    function onScroll() {
      btn.classList.toggle('is-show', window.scrollY > 500);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
