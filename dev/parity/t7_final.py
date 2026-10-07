import asyncio, json, sys
import os as _os
HERE = _os.path.dirname(_os.path.abspath(__file__))
sys.path.insert(0, HERE)
from harness import *
from items import ITEMS
from t5_guard import build, VISIBLE_JS
from playwright.async_api import async_playwright

async def main():
    baseline = json.load(open(HERE + '/out/baseline.json'))
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        # 1) adminpanel vs pre-removal panel baseline
        rec = Recorder(); ctx = await new_context(b, rec)
        pp, _ = await boot_panel(ctx)                 # live members panel (dashboard only) on the same device
        await pp.screenshot(path=HERE + '/out/final_panel_admin.png')
        vis = await pp.evaluate(VISIBLE_JS)
        print('live panel (admin) visible nav:', [k for k, v in vis['nav'].items() if v], '| «مدیریت» header:', vis['group'], '| «پنل مدیریت» button:', vis['sideMgmt'])
        ap, fr, _ = await boot_admin(ctx)
        bad = []
        for slug, pg, tab in ITEMS:
            await admin_open(ap, fr, slug)
            if await fr.evaluate(VIEW_TEXT_JS) != baseline[slug]: bad.append(slug)
        print(f'adminpanel items identical to pre-removal panel: {len(ITEMS) - len(bad)}/{len(ITEMS)}', bad)
        print('device bridge:', await ap.evaluate("() => PuttDeviceStore.status().phase"))
        # device-local write through adminpanel «یوزرها» lands in the members panel storage on this device
        await admin_open(ap, fr, 'users')
        for js in ["() => document.getElementById('us-add').click()",
                   "() => { const s=(id,v)=>{const f=document.getElementById(id); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(f,v); f.dispatchEvent(new Event('input',{bubbles:true}));}; s('nu-name','عضو آزمایشی'); s('nu-user','finalcheck'); s('nu-pass','Final-Check-7'); }",
                   "() => document.getElementById('nu-save').click()"]:
            await fr.evaluate(js); await asyncio.sleep(0.8)
        await asyncio.sleep(2)
        in_panel = await pp.evaluate("() => (JSON.parse(localStorage.getItem('ga_users')||'[]')).some(u => u.user === 'finalcheck')")
        print('user created in adminpanel is in members-panel storage on this device:', in_panel)
        await ap.evaluate("() => location.hash = '#/m/users'"); await asyncio.sleep(1)
        await ap.screenshot(path=HERE + '/out/final_admin_users.png')
        await ctx.close()
        # 2) member experience: live panel vs pre-change panel (guard with nothing moved)
        texts = {}
        for label, html in (('before', build([])), ('live', None)):
            rec = Recorder(); ctx = await new_context(b, rec, viewport={'width': 1440, 'height': 1000})
            await ctx.add_init_script("() => {}")
            async def serve(route, request, html=html):
                if html is not None and request.method == 'GET' and request.url.split('?')[0].split('#')[0] in (PANEL, PANEL + 'index.html'):
                    return await route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html)
                return await route.fallback()
            await ctx.route('https://panel.puttclub.ir/**', serve)
            p = await ctx.new_page()
            await p.goto(PANEL); await p.wait_for_function("() => window.APP", timeout=60000); await asyncio.sleep(2)
            await p.evaluate("() => { localStorage.setItem('ga_session', 'p1'); }"); await p.reload()
            await p.wait_for_function("() => window.APP && document.getElementById('app').classList.contains('on')", timeout=60000); await asyncio.sleep(3)
            texts[label] = {'page': await p.evaluate(PAGE_JS), 'view': await p.evaluate(VIEW_TEXT_JS),
                            'nav': await p.evaluate("() => [...document.querySelectorAll('#app .nav-item[data-page], .member-mobile-link')].filter(n => getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().width > 0).map(n => n.dataset.page || n.textContent.trim())")}
            if label == 'live': await p.screenshot(path=HERE + '/out/final_panel_member.png')
            await ctx.close()
        print('member p1 — page:', texts['live']['page'], '| same view as before:', texts['before']['view'] == texts['live']['view'], '| same menu:', texts['before']['nav'] == texts['live']['nav'], texts['live']['nav'])
        await b.close()
asyncio.run(main())
