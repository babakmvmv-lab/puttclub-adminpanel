/* adminpanel ⇄ members-panel device storage (PUTT_DEVICE_BRIDGE_V1)
   ─────────────────────────────────────────────────────────────────────
   The academy keeps one thing on the device only — never in the cloud (cloud.js SKIP):
     ga_backup_slots   «پشتیبان آکادمی» copies kept on this device
   (Accounts used to be device-local too — ga_users / ga_player_users. Since 2026-10-07 they
   live in the cloud: Supabase Auth + ga_accounts, managed through the ga-accounts function,
   so they are no longer copied between the two sites.)
   It lives in panel.puttclub.ir's localStorage. So that «پشتیبان آکادمی» here manages exactly
   the copies the members panel uses on this device, the shell opens
   panel.puttclub.ir/admin-bridge.html in a hidden frame (same site → same storage), copies the
   key in BEFORE the academy starts, and writes every change back. Nothing is sent to any server. */
(function () {
  'use strict';
  var KEYS = ['ga_backup_slots'];   /* accounts moved to the cloud (ga_accounts) — ga_users/ga_player_users no longer bridged */
  var NS = 'putt-device-bridge';
  var cfg = window.ADMINPANEL_CONFIG || {};
  /* '' (local preview without a members panel) → bridge off; undefined → production URL */
  var URL_ = cfg.panelBridgeUrl === '' ? '' : (cfg.panelBridgeUrl || 'https://panel.puttclub.ir/admin-bridge.html');
  var ORIGIN = (function () { try { return new URL(URL_).origin; } catch (e) { return ''; } })();

  var st = { phase: 'idle', error: '', frame: null, seq: 0, waits: {}, ready: null, linked: false, lastWrite: null };
  var listeners = [];
  function emit() { listeners.forEach(function (f) { try { f(status()); } catch (e) {} }); }
  function status() { return { phase: st.phase, error: st.error, linked: st.linked, lastWrite: st.lastWrite, origin: ORIGIN }; }

  function call(op, extra, timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (!st.frame || !st.frame.contentWindow) return reject(new Error('bridge frame missing'));
      var id = ++st.seq;
      var t = setTimeout(function () { delete st.waits[id]; reject(new Error('timeout')); }, timeoutMs || 6000);
      st.waits[id] = function (m) { clearTimeout(t); delete st.waits[id]; m.ok ? resolve(m) : reject(new Error(m.error || 'bridge error')); };
      var msg = { ns: NS, op: op, id: id };
      for (var k in extra) msg[k] = extra[k];
      st.frame.contentWindow.postMessage(msg, ORIGIN);
    });
  }

  window.addEventListener('message', function (e) {
    if (!st.frame || e.source !== st.frame.contentWindow || e.origin !== ORIGIN) return;
    var m = e.data;
    if (!m || m.ns !== NS) return;
    if (m.id && st.waits[m.id]) { st.waits[m.id](m); return; }
    if (m.op === 'changed' && st.linked && KEYS.indexOf(m.key) >= 0) {
      /* a members-panel tab on this device changed it → mirror here (no echo: own writes do not fire 'storage' here) */
      try { if (m.value === null) localStorage.removeItem(m.key); else localStorage.setItem(m.key, m.value); } catch (err) {}
    }
  });

  /* Academy frame (same origin as this shell) wrote one of the keys → write it back to the members panel. */
  var queue = {}, flushTimer = null;
  function flush() {
    flushTimer = null;
    var values = queue; queue = {};
    if (!Object.keys(values).length) return;
    call('set', { values: values }, 8000).then(function () {
      st.lastWrite = new Date().toISOString(); st.error = ''; st.phase = 'linked'; emit();
    }).catch(function (err) {
      /* keep the values so the next change (or retry) sends them again */
      Object.keys(values).forEach(function (k) { if (!(k in queue)) queue[k] = values[k]; });
      st.phase = 'error'; st.error = 'ذخیره در پنل اعضا انجام نشد: ' + err.message; emit();
      if (!flushTimer) flushTimer = setTimeout(flush, 5000);
    });
  }
  window.addEventListener('storage', function (e) {
    if (!st.linked || !e.key || KEYS.indexOf(e.key) < 0 || e.storageArea !== localStorage) return;
    queue[e.key] = e.newValue;
    if (!flushTimer) flushTimer = setTimeout(flush, 150);
  });

  function link() {
    if (st.ready) return st.ready;
    st.phase = 'connecting'; emit();
    st.ready = new Promise(function (resolve) {
      if (!URL_) { st.phase = 'off'; emit(); return resolve(status()); }
      if (!ORIGIN) { st.phase = 'error'; st.error = 'آدرس پل پنل اعضا نامعتبر است'; emit(); return resolve(status()); }
      var f = document.createElement('iframe');
      f.src = URL_;
      f.title = 'panel device bridge';
      f.setAttribute('aria-hidden', 'true');
      f.tabIndex = -1;
      f.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
      st.frame = f;
      var attempts = 0;
      function hello() {
        call('hello', {}, 2500).then(function () {
          return call('get', { keys: KEYS }, 6000);
        }).then(function (m) {
          var v = m.values || {};
          KEYS.forEach(function (k) {
            if (typeof v[k] !== 'string') return;          /* panel never used on this device → keep local, panel will seed itself like before */
            try {
              var mine = localStorage.getItem(k);
              if (mine !== null && mine !== v[k]) localStorage.setItem('putt_prev_' + k, mine); /* one local safety copy, never synced */
              localStorage.setItem(k, v[k]);
            } catch (err) {}
          });
          st.linked = true; st.phase = 'linked'; st.error = ''; emit();
          resolve(status());
        }).catch(function (err) {
          if (++attempts < 3) return setTimeout(hello, 600);
          st.phase = 'error';
          st.error = 'اتصال به حافظهٔ پنل اعضا روی این دستگاه برقرار نشد (' + err.message + ')';
          emit();
          resolve(status());
        });
      }
      f.addEventListener('load', function () { hello(); });
      (document.body || document.documentElement).appendChild(f);
    });
    return st.ready;
  }

  function reset() {
    if (flushTimer) { clearTimeout(flushTimer); flush(); }
    if (st.frame && st.frame.parentNode) st.frame.parentNode.removeChild(st.frame);
    st.frame = null; st.ready = null; st.linked = false; st.phase = 'idle'; st.error = '';
    emit();
  }

  window.PuttDeviceStore = Object.freeze({
    link: link,
    reset: reset,
    status: status,
    onChange: function (f) { listeners.push(f); },
    keys: KEYS.slice()
  });
})();
