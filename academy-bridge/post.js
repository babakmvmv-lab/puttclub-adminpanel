/* adminpanel ⇄ academy bridge (runs after all academy scripts). */
(function () {
  'use strict';
  if (!window.__PUTT_IN_ADMIN) return;
  document.documentElement.classList.add('in-adminpanel');
  var shell = function () { try { return window.parent.PuttDashboard || null; } catch (e) { return null; } };
  var $ = function (s) { return document.querySelector(s); };

  function currentTarget() {
    var page = (location.hash || '').slice(1) || 'cmd';
    var tabEl = page === 'mgmt' ? $('.mgmt-tab.on') : null;
    return { page: page, tab: tabEl ? tabEl.getAttribute('data-tab') : '' };
  }

  var opening = false;
  function open(page, tab) {
    if (!window.APP || typeof APP.go !== 'function') return false;
    opening = true;
    try {
      APP.go(page);
      if (page === 'mgmt' && tab) {
        var t = document.querySelector('.mgmt-tab[data-tab="' + String(tab).replace(/[^a-z0-9_-]/gi, '') + '"]');
        if (t && !t.classList.contains('on')) t.click();
      }
    } finally { opening = false; }
    var v = $('#view'); if (v) v.scrollTop = 0;
    window.scrollTo(0, 0);
    return true;
  }

  function cloudStatus() {
    try {
      if (!window.GA_CLOUD || !GA_CLOUD.status) return null;
      var s = GA_CLOUD.status();
      return { phase: s.phase, msg: s.msg, pending: typeof s.pending === 'number' ? s.pending : 0, last: s.last || null };
    } catch (e) { return null; }
  }
  function pull() {
    try { if (window.GA_CLOUD && GA_CLOUD.pull) return Promise.resolve(GA_CLOUD.pull()); } catch (e) {}
    return Promise.resolve();
  }
  function push() {
    try { if (window.GA_CLOUD && GA_CLOUD.push) return Promise.resolve(GA_CLOUD.push('manual')); } catch (e) {}
    return Promise.resolve();
  }

  window.PUTT_BRIDGE = Object.freeze({ open: open, current: currentTarget, cloudStatus: cloudStatus, pull: pull, push: push });

  /* Tell the shell whenever the academy navigates by itself (buttons inside pages). */
  function wrapGo() {
    if (!window.APP || APP.__puttWrapped) return;
    var og = APP.go;
    try {
      APP.go = function () {
        var r = og.apply(this, arguments);
        if (!opening) setTimeout(function () { var sh = shell(); if (sh && sh.onFrameNav) sh.onFrameNav(currentTarget()); }, 0);
        return r;
      };
      APP.__puttWrapped = true;
    } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('.mgmt-tab');
    if (t && !opening) setTimeout(function () { var sh = shell(); if (sh && sh.onFrameNav) sh.onFrameNav(currentTarget()); }, 0);
  }, true);

  /* Wait until the academy app has entered as the bridged admin. */
  var tries = 0;
  (function waitReady() {
    var app = document.getElementById('app');
    var entered = app && app.classList.contains('on') && window.APP && APP.isAdmin && APP.isAdmin();
    if (entered) {
      wrapGo();
      var sh = shell();
      if (sh && sh.frameReady) sh.frameReady();
      return;
    }
    if (window.__PUTT_NO_ADMIN || ++tries > 200) { var s2 = shell(); if (s2 && s2.frameFailed) s2.frameFailed(window.__PUTT_NO_ADMIN ? 'no-admin' : ''); return; }
    setTimeout(waitReady, 100);
  })();
})();
