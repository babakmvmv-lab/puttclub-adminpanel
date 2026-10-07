import asyncio, json, sys, os, shutil, subprocess, tempfile, time
import os as _os
HERE = _os.path.dirname(_os.path.abspath(__file__))
sys.path.insert(0, HERE)
from harness import *
from items import ITEMS
from playwright.async_api import async_playwright

GAP = sys.argv[1] if len(sys.argv) > 1 and os.path.isdir(sys.argv[1]) else '/tmp/gap'
ORDER = [('academy-settings', ['mgmt:academy']), ('players', ['mgmt:players']), ('programs', ['mgmt:programs']),
         ('calendar', ['mgmt:calendar']), ('reception', ['mgmt:reception']), ('courses', ['mgmt:courses']),
         ('tournaments', ['mgmt:tournaments']), ('results', ['mgmt:results']), ('battle', ['mgmt:battle']),
         ('coin-requests', ['mgmt:coins']), ('honor', ['mgmt:honor']), ('avatar-shop', ['mgmt:shop']),
         ('avatar-land', ['mgmt:avatars']), ('labels', ['mgmt:labels']), ('contact', ['mgmt:contact']),
         ('info', ['mgmt:info']), ('users', ['users', 'mgmt:users']), ('subs', ['subs']),
         ('display-settings', ['settings']), ('backup', ['backup']), ('messages', ['messages', 'mgmt'])]
VIEWS = ['cmd', 'race', 'player', 'match', 'course', 'records', 'cal', 'tv', 'battle', 'academy', 'avatarland']
SLUG = {s: (p, t) for s, p, t in ITEMS}

def build(moved):
    d = tempfile.mkdtemp()
    shutil.copytree(os.path.join(GAP, 'members-only'), os.path.join(d, 'members-only'))
    json.dump(moved, open(os.path.join(d, 'members-only', 'moved.json'), 'w'))
    shutil.copy(os.path.join(GAP, 'index.html'), os.path.join(d, 'index.html'))
    subprocess.check_call([sys.executable, os.path.join(d, 'members-only', 'inject.py'), os.path.join(d, 'index.html')], stdout=subprocess.DEVNULL)
    return open(os.path.join(d, 'index.html'), 'rb').read()

VISIBLE_JS = r"""() => {
  const vis = e => { if (!e) return false; const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const nav = {}; document.querySelectorAll('#app .nav-item[data-page]').forEach(n => nav[n.dataset.page] = vis(n));
  return { nav, group: vis(document.getElementById('mgmt-group')), sideMgmt: vis(document.getElementById('side-mgmt-btn')) };
}"""
TABS_VIS_JS = r"""() => { const o = {}; document.querySelectorAll('.mgmt-tab').forEach(t => { const cs = getComputedStyle(t); o[t.dataset.tab] = cs.display !== 'none'; }); return o; }"""

async def check(b, html, moved_ids, baseline, label):
    rec = Recorder(); errs = []
    ctx = await new_context(b, rec)
    async def serve(route, request):
        if html is None: return await route.fallback()
        if request.method == 'GET' and request.url.split('?')[0].split('#')[0] in (PANEL, PANEL + 'index.html'):
            return await route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html)
        return await route.fallback()
    await ctx.route('https://panel.puttclub.ir/**', serve)
    p, _ = await boot_panel(ctx)
    p.on('pageerror', lambda e: errs.append(str(e)[:160]))
    res = {'label': label, 'problems': []}
    pages_moved = {m for m in moved_ids if ':' not in m}; tabs_moved = {m[5:] for m in moved_ids if m.startswith('mgmt:')}
    allm = 'mgmt' in pages_moved or len(tabs_moved) == 17
    vis = await p.evaluate(VISIBLE_JS)
    for pg, v in vis['nav'].items():
        should = not (pg in pages_moved or (pg == 'mgmt' and allm))
        if pg in ('memberzone',): continue
        if v != should and pg in ('users', 'subs', 'settings', 'backup', 'messages', 'mgmt') + tuple(VIEWS): res['problems'].append(f'nav {pg} visible={v} expected={should}')
    if vis['sideMgmt'] == allm: res['problems'].append(f"side «پنل مدیریت» button visible={vis['sideMgmt']} while mgmt moved={allm}")
    groupGone = allm and all(x in pages_moved for x in ('users', 'subs', 'settings', 'backup', 'messages'))
    if vis['group'] == groupGone: res['problems'].append(f"«مدیریت» header visible={vis['group']} groupGone={groupGone}")
    # moved pages must be unreachable through APP.go and direct hash
    for pg in sorted(pages_moved | ({'mgmt'} if allm else set())):
        await panel_open(p, 'cmd'); await p.evaluate("(pg) => APP.go(pg)", pg); await asyncio.sleep(0.6)
        if (await p.evaluate(PAGE_JS)) == pg: res['problems'].append(f'APP.go({pg}) still opens it')
    # tabs
    if not allm:
        await panel_open(p, 'mgmt')
        tv = await p.evaluate(TABS_VIS_JS)
        for t, v in tv.items():
            if v == (t in tabs_moved): res['problems'].append(f'tab {t} visible={v}')
        on = await p.evaluate(TAB_JS)
        if on in tabs_moved: res['problems'].append(f'active tab {on} is a moved one')
    # remaining items: same text as baseline
    for slug, (pg, tab) in SLUG.items():
        gone = (pg in pages_moved) or (pg == 'mgmt' and (allm or tab in tabs_moved))
        if gone: continue
        await panel_open(p, pg, tab)
        loc = (await p.evaluate(PAGE_JS), await p.evaluate(TAB_JS))
        txt = await p.evaluate(VIEW_TEXT_JS)
        if loc != (pg, tab) or txt != baseline[slug]: res['problems'].append(f'remaining item {slug} changed: loc={loc} same_text={txt == baseline[slug]}')
    for v in VIEWS:
        await panel_open(p, v)
        txt = await p.evaluate(VIEW_TEXT_JS)
        if txt != baseline['view:' + v]: res['problems'].append(f'dashboard page {v} changed (len {len(txt)} vs {len(baseline["view:" + v])})')
    # direct address of a moved page on load
    if pages_moved:
        pg = sorted(pages_moved)[0]
        await p.goto(PANEL + '#' + pg); await p.wait_for_function("() => window.APP && document.getElementById('app').classList.contains('on')", timeout=60000); await asyncio.sleep(1.5)
        if (await p.evaluate(PAGE_JS)) == pg: res['problems'].append(f'direct #{pg} still opens it')
    if errs: res['problems'].append('page errors: ' + '; '.join(errs[:3]))
    leaked = [w for w in rec.writes if 'ga-sync' not in w['url'] and w['who'] == 'panel']
    if leaked: res['problems'].append(f'unexpected writes {len(leaked)}')
    await ctx.close()
    return res

async def main():
    start = int(os.environ.get('FROM', '0')); upto = int(os.environ.get('UPTO', str(len(ORDER))))
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        bl_path = HERE + '/out/baseline.json'
        if os.path.exists(bl_path) and os.environ.get('REBASE') != '1':
            baseline = json.load(open(bl_path))
        else:
            rec = Recorder(); ctx = await new_context(b, rec); p, _ = await boot_panel(ctx); baseline = {}
            for slug, (pg, tab) in SLUG.items():
                await panel_open(p, pg, tab); baseline[slug] = await p.evaluate(VIEW_TEXT_JS)
            for v in VIEWS:
                await panel_open(p, v); baseline['view:' + v] = await p.evaluate(VIEW_TEXT_JS)
            json.dump(baseline, open(bl_path, 'w'), ensure_ascii=False); await ctx.close()
            print('baseline captured from live panel:', len(baseline), 'pages')
        # step 0: guard v2 with nothing moved must be a no-op
        if start == 0:
            r = await check(b, build([]), [], baseline, 'step 0 (nothing moved)')
            print(('OK  ' if not r['problems'] else 'FAIL') + ' ' + r['label'], r['problems'][:5])
        moved = []
        for i, (slug, ids) in enumerate(ORDER, 1):
            moved = moved + ids
            if i < max(start, 1) or i > upto: continue
            t0 = time.time()
            r = await check(b, build(moved), moved, baseline, f'step {i:2d}: −{slug}')
            print(('OK  ' if not r['problems'] else 'FAIL') + f" {r['label']:28s} ({time.time() - t0:.0f}s)", r['problems'][:6], flush=True)
        await b.close()
if __name__ == "__main__":
    asyncio.run(main())
