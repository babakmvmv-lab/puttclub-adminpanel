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
     On a fresh browser the academy seeds its standard list exactly like the panel does;
     we only make sure the main admin account exists and open the session as it.
     The academy's own login form is never reachable here (frame gated by the shell). */
  try {
    var list = [];
    try { list = JSON.parse(localStorage.getItem('ga_users') || '[]'); } catch (e) { list = []; }
    if (Array.isArray(list) && list.length) {
      var rec = null;
      for (var i = 0; i < list.length; i++) if (list[i] && String(list[i].user || '').trim().toLowerCase() === 'admin') { rec = list[i]; break; }
      if (!rec) {
        var maxId = 0;
        list.forEach(function (u) { if (u && +u.id > maxId) maxId = +u.id; });
        var a = new Uint8Array(16); window.crypto.getRandomValues(a);
        rec = { id: maxId + 1, user: 'admin', pass: Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''), name: 'مدیر آکادمی', role: 'admin', active: true, main: true };
        list.unshift(rec);
      }
      rec.role = 'admin'; rec.active = true; rec.main = true;
      localStorage.setItem('ga_users', JSON.stringify(list));
    }
    localStorage.setItem('ga_session', 'admin');
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
