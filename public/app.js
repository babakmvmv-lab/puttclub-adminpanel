(() => {
  'use strict';
  const cfg = window.ADMINPANEL_CONFIG || {};
  const SESSION_KEY = 'puttclub_admin_session_v1';
  const $ = (selector) => document.querySelector(selector);
  const loginView = $('#loginView');
  const dashboardView = $('#dashboardView');
  const loginForm = $('#loginForm');
  const loginMessage = $('#loginMessage');
  const transportMessage = $('#transportMessage');
  const loginSubmit = $('#loginSubmit');
  let clockTimer = null;
  let busy = false;

  const tehranDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran', day: 'numeric', month: 'long', year: 'numeric'
  });
  const tehranTime = new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  const shortTehranTime = new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });

  function updateClock() {
    const now = new Date();
    const dateEl = $('#tehranDate');
    const timeEl = $('#tehranTime');
    const loginTime = $('#loginClock');
    if (dateEl) dateEl.textContent = tehranDate.format(now);
    if (timeEl) timeEl.textContent = tehranTime.format(now);
    if (loginTime) loginTime.textContent = shortTehranTime.format(now);
  }

  function updateSystemStatus() {
    const status = $('#systemStatus');
    const label = $('#systemStatusText');
    if (!status || !label) return;
    const online = navigator.onLine !== false;
    status.classList.toggle('is-offline', !online);
    label.textContent = online ? 'سیستم آنلاین' : 'سیستم آفلاین';
  }

  function startClock() {
    updateClock();
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = setInterval(updateClock, 1000);
  }

  function showMessage(text, kind = 'error') {
    loginMessage.textContent = text;
    loginMessage.classList.toggle('info', kind === 'info');
    loginMessage.hidden = !text;
  }

  function setBusy(value) {
    busy = value;
    loginSubmit.disabled = value || !authIsConfigured();
    loginSubmit.querySelector('span').textContent = value ? 'در حال بررسی…' : 'تأیید هویت و ورود';
  }

  function isSecureTransport() {
    if (window.location.protocol === 'https:') return true;
    const host = window.location.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  }

  function authIsConfigured() {
    return isSecureTransport() && typeof cfg.supabaseUrl === 'string' && /^https:\/\//i.test(cfg.supabaseUrl) &&
      typeof cfg.publicKey === 'string' && cfg.publicKey.trim().length > 20;
  }

  function blockInsecureTransport() {
    loginForm.hidden = true;
    transportMessage.textContent = 'برای حفاظت از اطلاعات ورود، فرم فقط روی اتصال امن HTTPS فعال می‌شود. تا آماده‌شدن گواهی HTTPS، اطلاعات ورود را وارد نکنید.';
    transportMessage.hidden = false;
  }

  function apiBase() {
    return cfg.supabaseUrl.replace(/\/+$/, '');
  }

  function authHeaders(accessToken) {
    return {
      apikey: cfg.publicKey,
      Authorization: 'Bearer ' + (accessToken || cfg.publicKey),
      'Content-Type': 'application/json'
    };
  }

  async function postAuth(path, body, accessToken) {
    const response = await fetch(apiBase() + '/auth/v1/' + path, {
      method: 'POST', headers: authHeaders(accessToken), body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.msg || payload.message || 'ورود انجام نشد. اطلاعات را بررسی کنید.');
    return payload;
  }

  function normalizeSession(raw) {
    const expiresIn = Math.max(0, Number(raw.expires_in || 0));
    return {
      access_token: raw.access_token,
      refresh_token: raw.refresh_token,
      expires_at: raw.expires_at ? Number(raw.expires_at) * 1000 : Date.now() + expiresIn * 1000,
      user: raw.user
    };
  }

  async function authorizedAdmin(session) {
    if (!session || !session.access_token || !session.user || !session.user.id) return null;
    const table = String(cfg.accessTable || 'adminpanel_access').replace(/[^a-zA-Z0-9_]/g, '');
    const query = new URLSearchParams({
      select: 'role,active', user_id: 'eq.' + session.user.id, active: 'eq.true', limit: '1'
    });
    const response = await fetch(apiBase() + '/rest/v1/' + table + '?' + query.toString(), {
      method: 'GET', headers: authHeaders(session.access_token), cache: 'no-store'
    });
    if (!response.ok) throw new Error('دسترسی مدیر در ساختار اختصاصی پنل تأیید نشد.');
    const rows = await response.json();
    const row = Array.isArray(rows) ? rows.find(r => r && r.active === true && ['admin', 'owner'].includes(r.role)) : null;
    return row ? row.role : null;
  }

  function saveSession(session) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (_) {}
  }

  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (_) { return null; }
  }

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  async function refreshSession(session) {
    if (!session || !session.refresh_token) return null;
    const renewed = await postAuth('token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    return normalizeSession(renewed);
  }

  function showDashboard(session, options = {}) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    document.body.classList.add('is-dashboard');
    const email = session && session.user && session.user.email;
    const manager = $('#managerEmail');
    if (manager) manager.textContent = email || 'مدیر';
    const role = $('#managerRole');
    if (role) role.textContent = session && session.role === 'owner' ? 'مدیر اصلی سیستم' : 'مدیر سیستم';
    const avatar = document.querySelector('.manager-avatar');
    if (avatar && email) avatar.textContent = email.charAt(0).toUpperCase();
    startClock();
    updateSystemStatus();
    window.PuttDashboard.mount({
      preview: !!options.preview,
      loadStore: options.preview ? null : loadStoreSummary
    });
    if (!options.preview) scheduleRefresh(session);
  }

  function showLogin() {
    dashboardView.hidden = true;
    loginView.hidden = false;
    document.body.classList.remove('is-dashboard');
    if (refreshTimer) clearTimeout(refreshTimer);
    startClock();
  }

  /* Keep the access token fresh while the dashboard stays open. */
  let refreshTimer = null;
  function scheduleRefresh(session) {
    if (refreshTimer) clearTimeout(refreshTimer);
    if (!session || !session.expires_at) return;
    const wait = Math.max(15000, session.expires_at - Date.now() - 90000);
    refreshTimer = setTimeout(async () => {
      try {
        const current = loadSession();
        const renewed = await refreshSession(current);
        if (!renewed) throw new Error('expired');
        renewed.role = current.role;
        saveSession(renewed);
        scheduleRefresh(renewed);
      } catch (_) {
        clearSession();
        showLogin();
        showMessage('نشست شما پایان یافت؛ دوباره وارد شوید.', 'info');
      }
    }, wait);
  }

  /* Read-only summary for the overview cards (small keys only). */
  async function loadStoreSummary() {
    const session = loadSession();
    if (!session || !session.access_token) throw new Error('no session');
    const keys = ['ga_subscriptions', 'ga_tournaments', 'ga_courses', 'ga_events'];
    const query = new URLSearchParams({ select: 'k,v', k: 'in.(' + keys.join(',') + ')' });
    const response = await fetch(apiBase() + '/rest/v1/ga_store?' + query.toString(), {
      method: 'GET', headers: authHeaders(session.access_token), cache: 'no-store'
    });
    if (!response.ok) throw new Error('store ' + response.status);
    const rows = await response.json();
    const map = {};
    (Array.isArray(rows) ? rows : []).forEach(row => { if (row && row.k) map[row.k] = row.v; });
    return map;
  }

  async function restoreSession() {
    if (!authIsConfigured()) return;
    let session = loadSession();
    if (!session) return;
    try {
      if (!session.expires_at || session.expires_at < Date.now() + 30000) {
        session = await refreshSession(session);
        if (!session) throw new Error('نشست پایان یافته است. دوباره وارد شوید.');
      }
      const role = await authorizedAdmin(session);
      if (!role) throw new Error('این حساب دسترسی مدیر پنل را ندارد.');
      session.role = role;
      saveSession(session);
      showDashboard(session);
    } catch (_) {
      clearSession();
      showLogin();
    }
  }

  async function signIn(email, password) {
    const authData = await postAuth('token?grant_type=password', { email, password });
    const session = normalizeSession(authData);
    const role = await authorizedAdmin(session);
    if (!role) {
      try { await postAuth('logout', {}, session.access_token); } catch (_) {}
      throw new Error('این حساب برای ورود به پنل مدیریت مجاز نیست.');
    }
    session.role = role;
    saveSession(session);
    showDashboard(session);
  }

  async function signOut() {
    const session = loadSession();
    clearSession();
    showLogin();
    if (session && session.access_token && authIsConfigured()) {
      try { await postAuth('logout', {}, session.access_token); } catch (_) {}
    }
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!isSecureTransport()) {
      blockInsecureTransport();
      return;
    }
    if (!authIsConfigured()) {
      showMessage('این پیش‌نمایش هنوز به احراز هویت سرور وصل نشده است؛ ورود واقعی تا تنظیم امن Supabase غیرفعال می‌ماند.', 'info');
      return;
    }
    const email = $('#loginEmail').value.trim().toLowerCase();
    const password = $('#loginPassword').value;
    if (!email || !password) {
      showMessage('ایمیل و رمز عبور را وارد کنید.');
      return;
    }
    setBusy(true);
    showMessage('');
    try {
      await signIn(email, password);
    } catch (error) {
      showMessage(error && error.message ? error.message : 'ورود انجام نشد؛ دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  });

  $('#togglePassword').addEventListener('click', () => {
    const input = $('#loginPassword');
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    $('#togglePassword').setAttribute('aria-label', visible ? 'پنهان‌کردن رمز عبور' : 'نمایش رمز عبور');
  });

  $('#logoutBtn').addEventListener('click', signOut);

  window.addEventListener('online', updateSystemStatus);
  window.addEventListener('offline', updateSystemStatus);

  startClock();
  if (!isSecureTransport()) {
    setBusy(false);
    blockInsecureTransport();
  } else if (!authIsConfigured() && window.ADMINPANEL_PREVIEW === true) {
    /* Local design preview only (dev/server.py). Never active when Supabase is configured. */
    setBusy(false);
    showDashboard({ user: { email: 'admin@puttclub.ir' }, role: 'owner' }, { preview: true });
  } else if (!authIsConfigured()) {
    setBusy(false);
    showMessage('پیش‌نمایش طراحی؛ برای ورود واقعی باید Supabase و جدول دسترسی اختصاصی پنل تنظیم شود.', 'info');
  } else {
    setBusy(false);
    restoreSession();
  }
})();
