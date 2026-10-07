import asyncio, json, sys
import os as _os
HERE = _os.path.dirname(_os.path.abspath(__file__))
sys.path.insert(0, HERE)
from t5_guard import build, check
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); baseline = json.load(open(HERE + '/out/baseline.json'))
        r = await check(b, build([]), ['mgmt:academy', 'users', 'mgmt:users'], baseline, 'NEGATIVE: claims moved, html unchanged')
        print(r['label'], '->', len(r['problems']), 'problems:', r['problems'])
        await b.close()
asyncio.run(main())
