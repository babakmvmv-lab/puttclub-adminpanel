import asyncio, json, sys
import os as _os
HERE = _os.path.dirname(_os.path.abspath(__file__))
sys.path.insert(0, HERE)
from harness import *
from playwright.async_api import async_playwright

SKIP = {'ga_session','ga_seed_v2','ga_cloud_cfg','ga_backup_slots','ga_cloud_dirty','ga_cloud_ts','__ga_t','ga_users','ga_player_users'}

async def main():
    rec = Recorder()
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctx = await new_context(b, rec)
        pp, pst = await boot_panel(ctx)
        print('panel cloud:', {k: pst.get(k) for k in ('phase','pending','msg')} if pst else None)
        ap, fr, ast = await boot_admin(ctx)
        print('admin cloud:', {k: ast.get(k) for k in ('phase','pending','msg')} if ast else None)
        print('device bridge:', await ap.evaluate("() => window.PuttDeviceStore && PuttDeviceStore.status()"))
        await asyncio.sleep(3)
        ps = await pp.evaluate(LOCAL_SNAPSHOT_JS); as_ = await fr.evaluate(LOCAL_SNAPSHOT_JS)
        keys = sorted(set(ps) | set(as_))
        same = [k for k in keys if ps.get(k) == as_.get(k)]
        diff = [k for k in keys if ps.get(k) != as_.get(k)]
        print(f'ga_* keys: panel={len(ps)} admin={len(as_)} identical={len(same)} different={len(diff)}')
        for k in diff:
            a, c = ps.get(k), as_.get(k)
            print('  DIFF', k, 'SKIP(device-local)' if k in SKIP else '', 'panel', None if a is None else len(a), 'admin', None if c is None else len(c))
        print('ga_users equal (bridge):', ps.get('ga_users') == as_.get('ga_users'), 'n=', len(json.loads(ps.get('ga_users') or '[]')))
        print('boot writes:', [(w['who'], w['url'].split('/')[-1], (w['body'].get('action') if isinstance(w['body'], dict) else str(w['body'])[:40]), [r.get('k') for r in (w['body'].get('rows') or [])] if isinstance(w['body'], dict) else '') for w in rec.writes])
        json.dump({'panel': ps, 'admin': as_}, open(HERE + '/out/boot_snapshot.json', 'w'), ensure_ascii=False)
        await b.close()
asyncio.run(main())
