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

  /* Academy accounts now live in the cloud (Supabase Auth + ga_accounts; managed through the
     ga-accounts edge function). Inside this shell the academy signs in as the console identity
     handed over by window.__PUTT_ADMIN (email + getToken) — auth.js reads it directly. We only
     pre-mark the session so the academy opens straight into the app instead of its login screen.
     Nothing here creates or alters an account, and no password is ever stored on this device. */
  try {
    localStorage.setItem('ga_session', String(shell.email).trim().toLowerCase());
    localStorage.removeItem('ga_users');          /* legacy device-local list (held passwords) */
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
