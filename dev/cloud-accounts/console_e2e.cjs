/* ادمین‌پنل + آکادمی جاسازی‌شده با حساب‌های ابری (2026-10-07) — E2E هرمتیک.
 * از ابر شبیه‌سازی‌شدهٔ golf-academy-pro (source/e2e/mock_cloud.cjs) استفاده می‌کند؛ هیچ درخواستی
 * به Supabase زنده، پنل اعضا یا هر میزبان دیگری نمی‌رود.
 * پیش‌نیاز: python3 tools/build_academy.py --src /path/to/golf-academy-pro
 * اجرا: MOCK=/path/to/golf-academy-pro/source/e2e/mock_cloud.cjs NODE_PATH=… CHROME=… node dev/cloud-accounts/console_e2e.cjs
 */
const path = require('path');
const { chromium } = require('playwright-core');
const { createMockCloud } = require(process.env.MOCK || '/tmp/golf-academy-pro/source/e2e/mock_cloud.cjs');
const ROOT = path.resolve(__dirname, '..', '..', 'public');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? 'PASS' : 'FAIL') + ' | ' + m); };

(async () => {
  const cloud = createMockCloud({
    store: {
      ga_battle: { v: 1, teams: [{ id: 'q1', name: 'تیم ابر', icon: '🦅', color: '#D4AF37', members: [] }], matches: [], settings: { winPts: 3, drawPts: 1, lossPts: 0 } },
      ga_subscriptions: [],
    },
    accounts: [
      { user: 'owner@example.test', pass: 'Console-Pass-QA1', role: 'admin', consoleAdmin: true },
      { id: 101, user: 'p1', pass: 'Member-Pass-QA1', name: 'بازیکن یک', role: 'member', pid: 1 },
      { id: 2, user: 'coach1', pass: 'Coach-Pass-QA1', name: 'مربی', role: 'admin' },
    ],
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 } });
  await cloud.attach(ctx, { root: ROOT });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')));
  await page.goto('https://qa.local/', { waitUntil: 'load' });

  // پیش از ورود: آکادمی مستقیماً باز نمی‌شود
  await page.fill('#loginEmail', 'owner@example.test');
  await page.fill('#loginPassword', 'Console-Pass-QA1');
  await page.click('#loginSubmit');
  await page.waitForFunction(() => !document.getElementById('dashboardView').hidden, null, { timeout: 20000 });
  ok(true, 'ورود کنسول ادمین‌پنل (Auth + adminpanel_access)');
  ok(await page.evaluate(() => !!(window.__PUTT_ADMIN && typeof window.__PUTT_ADMIN.getToken === 'function' && window.__PUTT_ADMIN.getToken())), '__PUTT_ADMIN.getToken توکن جلسه را می‌دهد');

  await page.evaluate(() => { location.hash = '#/m/users'; });
  const fh = await page.waitForSelector('#academyHost iframe', { timeout: 30000 });
  const fr = await fh.contentFrame();
  await fr.waitForFunction(() => window.APP && window.GA_AUTH && GA_AUTH.isReady() && document.getElementById('app').classList.contains('on'), null, { timeout: 40000 });
  await fr.waitForTimeout(4000);
  const st = await fr.evaluate(() => ({
    cur: APP.currentUser(), admin: APP.isAdmin(APP.currentUser()), main: APP.isMain(APP.currentUser()),
    mode: GA_AUTH.mode(), role: GA_CLOUD.role && GA_CLOUD.role(),
    staff: window.GA_SUB && GA_SUB.isStaff ? GA_SUB.isStaff(APP.currentUser()) : null,
    users: APP.users.list().map(u => u.user + ':' + u.role),
    lsUsers: localStorage.getItem('ga_users'),
    pw: Object.keys(localStorage).some(k => /Pass-QA/.test(localStorage.getItem(k) || '')),
  }));
  console.log('INFO | ' + JSON.stringify(st));
  ok(st.mode === 'adminpanel' && st.cur === 'owner@example.test', 'آکادمی با هویت کنسول باز شد (بدون فرم ورود آکادمی)');
  ok(st.admin && st.main && st.role === 'admin', 'هویت کنسول = مدیر اصلی');
  ok(st.staff === true, 'GA_SUB.isStaff برای هویت کنسول (کارمند، بدون نیاز به اشتراک)');
  ok(st.users.includes('p1:member') && st.users.includes('coach1:admin'), '«یوزرها» از ga-accounts (ابر) خوانده شد');
  ok(st.lsUsers == null && !st.pw, 'هیچ فهرست یوزر/رمزی روی دستگاه ادمین‌پنل نیست');
  const acc = cloud.log.filter(e => e.kind === 'accounts');
  ok(acc.length > 0 && acc.every(e => e.uid === 'uid-owner@example.test'), 'درخواست‌های ga-accounts با توکن کنسول');
  const reads = cloud.log.filter(e => e.kind === 'read');
  ok(reads.some(e => e.uid === 'uid-owner@example.test'), 'دریافت ga_store با توکن کنسول');
  const kv = cloud.log.filter(e => e.kind === 'sync' && e.action === 'kv');
  ok(!kv.some(e => (e.same || []).length), 'هیچ نوشتن تکراری هنگام باز شدن آکادمی: ' + JSON.stringify(kv.map(e => e.keys)));
  ok(!kv.some(e => e.keys.includes('ga_battle')), 'نبرد میدان‌ها بازنویسی نشد');

  // یک تغییر واقعی مدیر → با توکن کنسول ارسال می‌شود
  await fr.evaluate(() => localStorage.setItem('ga_results', JSON.stringify({ qa: Date.now() })));
  await fr.waitForTimeout(5500);
  const kv2 = cloud.log.filter(e => e.kind === 'sync' && e.action === 'kv' && e.keys.includes('ga_results'));
  ok(kv2.length > 0 && kv2.every(e => e.uid === 'uid-owner@example.test' && e.status === 200), 'تغییر مدیر با توکن کنسول ذخیره شد');
  // «تنظیمات نمایش» در «اشتراک‌ها» ادغام شد: آیتم منو حذف، نشانی قدیمی → ماتریس دسترسی
  ok(await page.evaluate(() => !document.querySelector('a[href="#/m/display-settings"]')), 'منوی «مدیریت»: آیتم «تنظیمات نمایش» حذف شده است');
  await page.evaluate(() => { location.hash = '#/m/display-settings'; });
  await page.waitForTimeout(2500);
  const fr2 = await (await page.waitForSelector('#academyHost iframe')).contentFrame();
  await fr2.waitForFunction(() => document.getElementById('acx-grid') && document.querySelectorAll('.acx-row.lv0').length === 12, null, { timeout: 20000 }).catch(() => {});
  const mx = await fr2.evaluate(() => ({ rows: document.querySelectorAll('.acx-row.lv0').length, plans: document.querySelectorAll('.acx-head .acx-plan').length, hash: location.hash }));
  ok(mx.rows === 12 && mx.plans === 5, 'نشانی قدیمی #/m/display-settings → «اشتراک‌ها» با ماتریس ۱۲ صفحه × ۵ پلن ' + JSON.stringify(mx));
  ok(/#\/m\/(subs|display-settings)$/.test(await page.evaluate(() => location.hash)), 'مسیر کنسول روی اشتراک‌ها ماند');
  /* شناخته‌شده و قدیمی (گزارش شده، طبق قاعده دست نخورده): app.js صفحهٔ cmd ← setTimeout ← Charts.spark($('#sp-1'))
     بدون بررسی null؛ اگر قبل از اجرای تایمر صفحه عوض شود (اینجا: پرش مستقیم به «یوزرها») خطای بی‌اثر livePrep می‌دهد. */
  const known = errors.filter(e => /getBoundingClientRect/.test(e) && /livePrep/.test(e));
  if (known.length) console.log('KNOWN | خطای قدیمی spark(#sp-1) ×' + known.length + ' (بی‌اثر؛ اصلاح پیشنهادی در گزارش)');
  errors.splice(0, errors.length, ...errors.filter(e => known.indexOf(e) < 0));
  ok(errors.length === 0, 'بدون خطای صفحه' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await page.screenshot({ path: process.env.SHOT || '/tmp/console_users.png' });
  await browser.close();
  console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
