import asyncio, json, sys
import os as _os
HERE = _os.path.dirname(_os.path.abspath(__file__))
sys.path.insert(0, HERE)
from t5_guard import check
from playwright.async_api import async_playwright
async def main():
    moved = json.load(open('/tmp/gap/members-only/moved.json'))
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); baseline = json.load(open(HERE + '/out/baseline.json'))
        r = await check(b, None, moved, baseline, 'LIVE panel.puttclub.ir, moved=%d ids' % len(moved))
        print(('OK  ' if not r['problems'] else 'FAIL'), r['label'], r['problems'])
        await b.close()
asyncio.run(main())
