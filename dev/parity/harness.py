"""Parity harness: live panel.puttclub.ir vs live adminpanel.puttclub.ir, same browser profile (= same device).

Safety (AGENTS.md: browser tests must block live writes):
  * every non-GET request is recorded and NEVER reaches a server:
      - POST .../functions/v1/ga-sync  -> fulfilled locally with a success ack (so the app behaves normally)
      - anything else (EmailJS, ga-mail, rest writes, beacons) -> aborted
  * GET requests pass through (real data is read from the live database).
  * adminpanel sign-in is simulated by a fake session + a mocked adminpanel_access row (no password used).
"""
import asyncio, json, re, time

PANEL = 'https://panel.puttclub.ir/'
ADMIN = 'https://adminpanel.puttclub.ir/'
SUPA = 'iultwqtzvrysugfxwshw.supabase.co'


class Recorder:
    def __init__(self):
        self.writes = []      # (origin_label, url, body_json_or_text)
        self.escaped = []     # must stay empty: non-GET that was neither faked nor aborted

    async def install(self, ctx):
        async def handler(route, request):
            m = request.method
            url = request.url
            if m in ('GET', 'HEAD', 'OPTIONS'):
                if SUPA in url and '/rest/v1/adminpanel_access' in url:
                    return await route.fulfill(status=200, content_type='application/json',
                                               body=json.dumps([{'role': 'owner', 'active': True}]))
                return await route.continue_()
            body = request.post_data or ''
            try:
                parsed = json.loads(body)
            except Exception:
                parsed = body
            frame_url = ''
            try:
                frame_url = request.frame.url
            except Exception:
                pass
            who = 'admin' if 'adminpanel.puttclub.ir' in frame_url else ('panel' if 'panel.puttclub.ir' in frame_url else frame_url[:40])
            self.writes.append({'who': who, 'method': m, 'url': url, 'body': parsed, 't': time.time()})
            if SUPA in url and '/functions/v1/ga-sync' in url:
                ack = {'ok': True}
                if isinstance(parsed, dict) and parsed.get('action') == 'kv':
                    ack.update(put=len(parsed.get('rows') or []), del_=0)
                    ack['del'] = ack.pop('del_')
                return await route.fulfill(status=200, content_type='application/json', body=json.dumps(ack))
            if SUPA in url and '/auth/v1/' in url:
                return await route.fulfill(status=200, content_type='application/json', body='{}')
            return await route.abort()
        await ctx.route('**/*', handler)

    def kv_rows(self, who=None, since=0.0):
        out = []
        for w in self.writes:
            if (who and w['who'] != who) or w['t'] < since:
                continue
            b = w['body']
            if isinstance(b, dict) and b.get('action') == 'kv':
                out.extend(b.get('rows') or [])
        return out


FAKE_SESSION_JS = """
(() => {
  if (location.hostname !== 'adminpanel.puttclub.ir') return;
  const s = { access_token: 'test.fake.token', refresh_token: 'fake', expires_at: Date.now() + 6*3600*1000,
              user: { id: '00000000-0000-4000-8000-0000000000aa', email: 'parity-test@puttclub.ir' }, role: 'owner' };
  try { sessionStorage.setItem('puttclub_admin_session_v1', JSON.stringify(s)); } catch (e) {}
})();
"""

PANEL_SESSION_JS = """
(() => {
  if (location.hostname !== 'panel.puttclub.ir' || window.top !== window) return;
  try { if (!localStorage.getItem('ga_session')) localStorage.setItem('ga_session', 'admin'); } catch (e) {}
})();
"""

DIALOGS = []


async def new_context(browser, rec, viewport=None):
    ctx = await browser.new_context(viewport=viewport or {'width': 1440, 'height': 1000}, locale='fa-IR',
                                    timezone_id='Asia/Tehran')
    await rec.install(ctx)
    await ctx.add_init_script(FAKE_SESSION_JS)
    await ctx.add_init_script(PANEL_SESSION_JS)
    return ctx


def on_dialog_accept(page, label):
    async def h(d):
        DIALOGS.append((label, d.type, d.message[:120]))
        try:
            if d.type == 'prompt':
                await d.accept(d.default_value or '')
            else:
                await d.accept()
        except Exception:
            pass
    page.on('dialog', lambda d: asyncio.ensure_future(h(d)))


async def wait_cloud_idle(target, timeout=45):
    """target: Page or Frame running the academy. Wait until the first pull finished."""
    t0 = time.time()
    while time.time() - t0 < timeout:
        try:
            st = await target.evaluate("() => window.GA_CLOUD ? GA_CLOUD.status() : null")
        except Exception:
            st = None
        if st and st.get('phase') in ('idle', 'off', 'error') and st.get('last'):
            return st
        await asyncio.sleep(0.5)
    return st


async def boot_panel(ctx):
    p = await ctx.new_page()
    on_dialog_accept(p, 'panel')
    await p.goto(PANEL, wait_until='domcontentloaded')
    await p.wait_for_function("() => window.APP && document.getElementById('app') && document.getElementById('app').classList.contains('on')", timeout=60000)
    st = await wait_cloud_idle(p)
    await asyncio.sleep(1.5)
    return p, st


async def boot_admin(ctx):
    p = await ctx.new_page()
    on_dialog_accept(p, 'admin')
    await p.goto(ADMIN + '#/overview', wait_until='domcontentloaded')
    await p.wait_for_selector('#academyFrame', state='attached', timeout=60000)
    fr = None
    t0 = time.time()
    while time.time() - t0 < 60:
        h = await p.query_selector('#academyFrame')
        fr = await h.content_frame() if h else None
        if fr:
            try:
                ok = await fr.evaluate("() => !!(window.PUTT_BRIDGE && window.APP && document.getElementById('app').classList.contains('on'))")
                if ok:
                    break
            except Exception:
                pass
        await asyncio.sleep(0.5)
    st = await wait_cloud_idle(fr)
    await asyncio.sleep(1.5)
    return p, fr, st


async def panel_open(p, page, tab=''):
    await p.evaluate("""([page, tab]) => {
        APP.go(page);
        if (page === 'mgmt' && tab) { const t = document.querySelector('.mgmt-tab[data-tab="'+tab+'"]'); if (t && !t.classList.contains('on')) t.click(); }
        window.scrollTo(0,0);
    }""", [page, tab])
    await asyncio.sleep(1.2)


async def admin_open(p, fr, slug):
    await p.evaluate("(s) => { location.hash = '#/m/' + s; }", slug)
    await asyncio.sleep(1.5)


VIEW_TEXT_JS = r"""() => {
  const v = document.getElementById('view'); if (!v) return '';
  const c = v.cloneNode(true);
  c.querySelectorAll('script,style,canvas,svg').forEach(n => n.remove());
  return (c.textContent || '').replace(/\s+/g, ' ').trim();
}"""

VIEW_SHAPE_JS = r"""() => {
  const v = document.getElementById('view'); if (!v) return {};
  const q = s => v.querySelectorAll(s).length;
  return { inputs: q('input'), selects: q('select'), textareas: q('textarea'), buttons: q('button'), rows: q('tr'), imgs: q('img') };
}"""

TAB_JS = "() => { const t = document.querySelector('.mgmt-tab.on'); return t ? t.dataset.tab : ''; }"
PAGE_JS = "() => (location.hash||'').slice(1)"

LOCAL_SNAPSHOT_JS = r"""() => {
  const o = {};
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^ga_/.test(k)) o[k] = localStorage.getItem(k); }
  return o;
}"""
