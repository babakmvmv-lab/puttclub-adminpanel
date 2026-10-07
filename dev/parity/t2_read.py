import asyncio, json, sys, difflib
import os as _os
HERE = _os.path.dirname(_os.path.abspath(__file__))
sys.path.insert(0, HERE)
from harness import *
from items import ITEMS
from playwright.async_api import async_playwright

async def main():
    rec = Recorder()
    res = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await new_context(b, rec)
        pp, _ = await boot_panel(ctx)
        ap, fr, _ = await boot_admin(ctx)
        # all mgmt tabs present in the panel
        await panel_open(pp, 'mgmt')
        tabs = await pp.evaluate("() => [...document.querySelectorAll('.mgmt-tab')].map(t => t.dataset.tab)")
        print('panel mgmt tabs:', len(tabs), tabs)
        only = sys.argv[1:]
        for slug, page, tab in ITEMS:
            if only and slug not in only: continue
            await panel_open(pp, page, tab)
            await admin_open(ap, fr, slug)
            pt, at = await pp.evaluate(VIEW_TEXT_JS), await fr.evaluate(VIEW_TEXT_JS)
            psh, ash = await pp.evaluate(VIEW_SHAPE_JS), await fr.evaluate(VIEW_SHAPE_JS)
            ploc = (await pp.evaluate(PAGE_JS), await pp.evaluate(TAB_JS)); aloc = (await fr.evaluate(PAGE_JS), await fr.evaluate(TAB_JS))
            same = pt == at
            r = {'same_text': same, 'len': [len(pt), len(at)], 'shape_same': psh == ash, 'shape': psh, 'panel_loc': ploc, 'admin_loc': aloc}
            if not same:
                sm = difflib.SequenceMatcher(None, pt, at)
                r['diff'] = [(op, pt[i1:i2][:160], at[j1:j2][:160]) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal'][:6]
            res[slug] = r
            print(f"{'OK ' if same and psh == ash else 'DIFF'} {slug:17s} panel={ploc} admin={aloc} text={len(pt)}/{len(at)} inputs={psh.get('inputs')}/{ash.get('inputs')} buttons={psh.get('buttons')}/{ash.get('buttons')}")
            if not same:
                for d in r['diff'][:3]: print('      ', d)
            await pp.screenshot(path=f'{HERE}/out/p_{slug}.png'); await ap.screenshot(path=f'{HERE}/out/a_{slug}.png')
        json.dump(res, open(HERE + '/out/read_parity.json', 'w'), ensure_ascii=False, indent=1)
        print('escaped writes:', [w for w in rec.writes if 'ga-sync' not in w['url'] and w['who'] in ('panel','admin')][:3])
        await b.close()
asyncio.run(main())
