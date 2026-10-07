import asyncio, json, sys, time, re
import os as _os
HERE = _os.path.dirname(_os.path.abspath(__file__))
sys.path.insert(0, HERE)
from harness import *
from playwright.async_api import async_playwright

T = 'تست‌برابری'
SCEN = [  # slug, panel page, tab, steps
 ('academy-settings','mgmt','academy',[('append','#ac-nameFa',' ·T'),('clickText','ذخیره پوسته')]),
 ('players','mgmt','players',[('fill','#pf-name',T),('clickText','ثبت بازیکن در آکادمی')]),
 ('programs','mgmt','programs',[('fill','#pr-name','دوره '+T),('clickText','ثبت دوره')]),
 ('calendar','mgmt','calendar',[('fill','#me-name','رویداد '+T),('clickText','ثبت رویداد در تقویم')]),
 ('reception','mgmt','reception',[('append','#rcp-intro',' ·T'),('clickText','ذخیرهٔ همهٔ بخش')]),
 ('courses','mgmt','courses',[('fill','#mc-name','زمین '+T),('clickText','ثبت زمین')]),
 ('tournaments','mgmt','tournaments',[('fill','#r1p1','777'),('click','#rules-save'),('fill','#mt-name','جام '+T),('click','#mt-add')]),
 ('results','mgmt','results',[('click','[data-mrrep="1000"]'),('click','#tr-finalize')]),
 ('battle','mgmt','battle',[('fill','#bt-win','4'),('click','#bt-settings-save'),('selectIdx','#bt-m-home',1),('selectIdx','#bt-m-away',2),('click','#bt-add-match')]),
 ('coin-requests','mgmt','coins',[('selectIdx','#cg-user',1),('fill','#cg-amt','5'),('fill','#cg-note',T),('click','#cg-add')]),
 ('honor','mgmt','honor',[('fill','#hr-pts','123'),('click','#hr-save'),('fill','#rr-n1','7'),('click','#rr-save')]),
 ('avatar-shop','mgmt','shop',[('fill','#np-n','محصول '+T),('fill','#np-p','100'),('fill','#np-st','3'),('click','#np-add')]),
 ('avatar-land','mgmt','avatars',[('toggleFirst','input[type=checkbox]'),('clickText','ذخیره قوانین')]),
 ('labels','mgmt','labels',[('appendNth','input:not([type])',0,' ·T'),('click','#lbl-save')]),
 ('contact','mgmt','contact',[('append','#ct-phone',' 1'),('clickText','ذخیرهٔ اطلاعات تماس')]),
 ('info','mgmt','info',[('append','#in-intro',' ·T'),('clickText','ذخیرهٔ اطلاعات')]),
 ('users','users','',[('click','#us-add'),('fill','#nu-name','عضو '+T),('fill','#nu-user','paritytest'),('fill','#nu-pass','Parity-Pass-9'),('click','#nu-save')]),
 ('subs','subs','',[('click','[data-sub="p2"]'),('selectIdx','#sub-m-plan',1),('click','#sub-m-save')]),
 ('display-settings','settings','',[('click','#st-all-off'),('click','#st-all-on')]),
 ('backup','backup','',[('click','#gab-slot')]),
 ('messages','messages','',[('click','[data-pmch="both"]'),('fill','#pm-subject','پیام '+T),('fill','#pm-body','متن '+T),('click','#pm-all'),('click','#pm-send')]),
]

STEP_JS = r"""([op, sel, a, b]) => {
  const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const setv = (f, val) => { const proto = f.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : (f.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype);
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(f, val); f.dispatchEvent(new Event('input', { bubbles: true })); f.dispatchEvent(new Event('change', { bubbles: true })); };
  const v = document.getElementById('view');
  const scope = () => { const m = [...document.querySelectorAll('[id^=modal],#tour-report')].filter(vis); return m.length ? m[m.length-1] : v; };
  if (op === 'clickText') { const bt = [...scope().querySelectorAll('button')].filter(vis).find(x => x.textContent.includes(sel)); if (!bt) return 'NOBTN ' + sel; bt.click(); return 'ok'; }
  const all = [...document.querySelectorAll(sel)].filter(vis);
  if (!all.length) return 'NOEL ' + sel;
  if (op === 'click') { all[0].click(); return 'ok'; }
  if (op === 'fill') { setv(all[0], a); return 'ok'; }
  if (op === 'append') { setv(all[0], (all[0].value || '') + a); return 'ok'; }
  const inView = all.filter(e => v.contains(e));
  if (op === 'appendFirst') { const f = inView[0]; if (!f) return 'NOEL'; setv(f, (f.value || '') + a); return 'ok'; }
  if (op === 'appendNth') { const f = inView[a]; if (!f) return 'NOEL'; setv(f, (f.value || '') + b); return 'ok'; }
  if (op === 'toggleFirst') { const f = inView[0]; if (!f) return 'NOEL'; f.click(); return 'ok'; }
  if (op === 'selectIdx') { const s = all[0]; if (s.options.length <= a) return 'NOOPT'; setv(s, s.options[a].value); return 'ok'; }
  return 'BADOP';
}"""
CLOSE_JS = "() => document.querySelectorAll('[id^=modal],#tour-report').forEach(m => { if (getComputedStyle(m).display !== 'none') m.style.display = 'none'; })"

MS = re.compile(r'1[6-9]\d{11}')
ISO = re.compile(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z')
def norm(x, key=''):
    if isinstance(x, dict): return {k: norm(v, k) for k, v in sorted(x.items())}
    if isinstance(x, list): return [norm(v) for v in x]
    if key in ('pass', 'password', 'token', 'salt', 'hash'): return '<SECRET>'
    if isinstance(x, (int, float)) and not isinstance(x, bool) and 1.6e12 <= x <= 2e12: return '<MS>'
    if isinstance(x, str):
        s = ISO.sub('<TS>', x); s = MS.sub('<MS>', s)
        s = re.sub(r'<MS>[-_]?[a-z0-9]{3,10}\b', '<MS>', s)
        s = re.sub(r'\b[0-9a-f]{12,}\b|\b[a-z0-9]{8,12}(?=$)', lambda m: '<RID>' if re.search(r'\d', m.group(0)) and re.search(r'[a-z]', m.group(0)) else m.group(0), s)
        try:
            j = json.loads(s)
            if isinstance(j, (dict, list)): return norm(j)
        except Exception: pass
        return s
    return x

async def run_app(kind):
    rec = Recorder(); out = {'items': {}}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); ctx = await new_context(b, rec)
        if kind == 'panel': page, _ = await boot_panel(ctx); target = page
        else: page, target, _ = await boot_admin(ctx)
        boot_n = len(rec.writes)
        for slug, pg, tab, steps in SCEN:
            if ONLY and slug not in ONLY: continue
            if kind == 'panel': await panel_open(page, pg, tab)
            else: await admin_open(page, target, slug)
            before = await target.evaluate(LOCAL_SNAPSHOT_JS)
            n0 = len(rec.writes)
            res = []
            for st in steps:
                op, sel = st[0], st[1]; a = st[2] if len(st) > 2 else None; bb = st[3] if len(st) > 3 else None
                try: r = await target.evaluate(STEP_JS, [op, sel, a, bb])
                except Exception as e: r = 'ERR ' + str(e)[:80]
                res.append(r); await asyncio.sleep(0.9)
            await asyncio.sleep(0.8)
            try: await target.evaluate("() => window.GA_CLOUD && GA_CLOUD.push('test')")
            except Exception: pass
            await asyncio.sleep(3.5)
            after = await target.evaluate(LOCAL_SNAPSHOT_JS)
            changed = {k: norm(after.get(k)) for k in sorted(set(before) | set(after)) if before.get(k) != after.get(k) and k not in ('ga_cloud_ts', 'ga_cloud_dirty', 'ga_session')}
            other = sorted({re.sub(r'https?://([^/]+).*', r'\1', w['url']) + ' ' + w['method'] for w in rec.writes[n0:] if 'ga-sync' not in w['url']})
            out['items'][slug] = {'steps': res, 'changed': changed, 'other': other,
                                  'dialogs': [d for d in DIALOGS if d[0] == kind][-3:]}
            try: await target.evaluate(CLOSE_JS)
            except Exception: pass
        await asyncio.sleep(2)
        cloud = {}
        for w in rec.writes[boot_n:]:
            bd = w['body']
            if isinstance(bd, dict) and bd.get('action') in ('kv', 'public'):
                for r in bd.get('rows') or []: cloud[(bd['action'], r.get('k'))] = norm(r.get('v'))
        out['cloud'] = {f'{a}:{k}': v for (a, k), v in cloud.items()}
        if kind == 'admin':
            bp = await ctx.new_page(); await bp.goto('https://panel.puttclub.ir/admin-bridge.html')
            pd = await bp.evaluate("() => Object.fromEntries(['ga_users','ga_player_users','ga_backup_slots'].map(k => [k, localStorage.getItem(k)]))")
            mine = await target.evaluate("() => Object.fromEntries(['ga_users','ga_player_users','ga_backup_slots'].map(k => [k, localStorage.getItem(k)]))")
            out['bridge_equal'] = {k: pd[k] == mine[k] for k in pd}
            out['bridge'] = await page.evaluate("() => PuttDeviceStore.status()")
        await b.close()
    return out

ONLY = sys.argv[1:]
async def main():
    P, A = await asyncio.gather(run_app('panel'), run_app('admin'))
    json.dump({'panel': P, 'admin': A}, open(HERE + '/out/write_parity_%s.json' % ('_'.join(ONLY) or 'all'), 'w'), ensure_ascii=False, indent=1, default=str)
    allok = True
    for slug, *_ in SCEN:
        if ONLY and slug not in ONLY: continue
        p, a = P['items'][slug], A['items'][slug]
        same = json.dumps(p['changed'], sort_keys=True, ensure_ascii=False) == json.dumps(a['changed'], sort_keys=True, ensure_ascii=False)
        ok = same and p['steps'] == a['steps'] and p['other'] == a['other']
        allok &= ok
        print(f"{'OK ' if ok else 'DIFF'} {slug:17s} steps={p['steps']} keys={list(p['changed'])} other={p['other']}")
        if not ok:
            print('      admin steps', a['steps'], 'keys', list(a['changed']), a['other'])
            for k in sorted(set(p['changed']) | set(a['changed'])):
                x, y = json.dumps(p['changed'].get(k), ensure_ascii=False, sort_keys=True), json.dumps(a['changed'].get(k), ensure_ascii=False, sort_keys=True)
                if x != y:
                    import difflib
                    sm = difflib.SequenceMatcher(None, x, y)
                    print('      ', k, [(o, x[i1:i2][:90], y[j1:j2][:90]) for o, i1, i2, j1, j2 in sm.get_opcodes() if o != 'equal'][:3])
    cp, ca = P['cloud'], A['cloud']
    cl_same = [k for k in cp if json.dumps(cp[k], sort_keys=True) == json.dumps(ca.get(k), sort_keys=True)]
    print(f"\nfinal cloud writes: panel={len(cp)} keys, admin={len(ca)} keys, identical={len(cl_same)}  diff={sorted(set(cp) ^ set(ca)) + [k for k in cp if k in ca and k not in cl_same]}")
    print('bridge:', A.get('bridge'), 'panel-storage == admin device keys:', A.get('bridge_equal'))
    print('ALL ITEMS IDENTICAL:', allok)
asyncio.run(main())
