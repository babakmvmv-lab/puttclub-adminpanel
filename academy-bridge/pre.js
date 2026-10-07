/* adminpanel ⇄ academy bridge (runs first inside /academy/, before any academy script).
   The academy app is only usable inside the signed-in adminpanel shell. */
(function () {
  'use strict';
  var shell = null;
  try {
    if (window.parent !== window && window.parent.location.origin === location.origin) shell = window.parent.__PUTT_ADMIN || null;
  } catch (e) { shell = null; }
  if (!shell || !shell.email) {
    try { window.stop(); } catch (e) {}
    try { (window.top || window).location.replace('/'); } catch (e) { location.replace('/'); }
    document.documentElement.innerHTML = '';
    throw new Error('adminpanel: academy requires the signed-in admin shell');
  }
  window.__PUTT_IN_ADMIN = true;

  /* Academy accounts are device-local by design (ga_users never syncs to the cloud).
     The shell has already copied the members panel's list for this device in
     (public/device-bridge.js), and every change here is written back to it — so this
     must never create or alter an account. We only open the session as the panel's
     main admin. An empty list behaves exactly like a fresh panel device: the academy's
     own seedUsers creates the standard list. */
  try {
    var list = [];
    try { list = JSON.parse(localStorage.getItem('ga_users') || '[]'); } catch (e) { list = []; }
    var who = null;
    if (Array.isArray(list) && list.length) {
      var ok = function (u) { return u && u.role === 'admin' && u.active !== false && String(u.user || '').trim(); };
      var main = list.filter(function (u) { return ok(u) && u.main; })[0];
      var any = list.filter(ok)[0];
      who = main || any || null;
      if (who) localStorage.setItem('ga_session', String(who.user).trim());
      else { localStorage.removeItem('ga_session'); window.__PUTT_NO_ADMIN = true; }
    } else {
      localStorage.setItem('ga_session', 'admin');
    }
  } catch (e) {}

  /* Keep browser history clean: the shell owns navigation. */
  try {
    var rs = history.replaceState.bind(history);
    history.pushState = function (s, t, u) { return rs(s, t, u); };
  } catch (e) {}

  /* Local design preview: never write to the live academy cloud. */
  if (shell.preview === true && window.fetch) {
    var of = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (/supabase\.co/.test(url) && method !== 'GET' && method !== 'HEAD') {
        return Promise.reject(new Error('preview: cloud writes are disabled'));
      }
      return of(input, init);
    };
  }
})();
