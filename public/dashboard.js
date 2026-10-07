/* Putt Club adminpanel — grouped RTL navigation, overview and module routing. */
(() => {
  'use strict';

  /* Static, trusted SVG fragments (never user data). */
  const ICONS = {
    crown: '<path d="M3.5 8.5 8 12l4-6.5 4 6.5 4.5-3.5-2 10h-13z"/><path d="M5.5 21h13"/>',
    overview: '<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/>',
    gear: '<path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="m19.4 13.5 1.2.9-1.5 2.6-1.4-.6a7.7 7.7 0 0 1-1.5.9l-.2 1.5h-3l-.3-1.5a7.7 7.7 0 0 1-1.5-.9l-1.4.6-1.5-2.6 1.2-.9a7.3 7.3 0 0 1 0-1.8l-1.2-.9 1.5-2.6 1.4.6a7.7 7.7 0 0 1 1.5-.9l.3-1.5h3l.2 1.5a7.7 7.7 0 0 1 1.5.9l1.4-.6 1.5 2.6-1.2.9a7.3 7.3 0 0 1 0 1.8Z"/>',
    players: '<circle cx="9" cy="8" r="3.4"/><path d="M3 19.5v-.8A4.7 4.7 0 0 1 7.7 14h2.6a4.7 4.7 0 0 1 4.7 4.7v.8"/><path d="M15.5 4.8a3.4 3.4 0 0 1 0 6.4M17.5 14.2a4.7 4.7 0 0 1 3.5 4.5v.8"/>',
    book: '<path d="M4.5 5.5A2 2 0 0 1 6.5 3.5h13v14h-13a2 2 0 0 0-2 2z"/><path d="M4.5 19.5a2 2 0 0 0 2 2h13v-4M9 8h6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M7.5 3.5v3M16.5 3.5v3M4 9.5h16M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5v-.5A5.5 5.5 0 0 1 10 14.5h4a5.5 5.5 0 0 1 5.5 5.5v.5"/>',
    flag: '<path d="M6 21V3.5"/><path d="M6 4h11.5l-2.5 4 2.5 4H6"/><path d="M3.5 21h6"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3.2 4M16 6h3a3 3 0 0 1-3.2 4M12 13v4M8 20.5h8M9.5 17h5"/>',
    chart: '<path d="M4 20.5h16.5M6.5 17v-6M11 17V6.5M15.5 17v-4M20 17V9"/>',
    swords: '<path d="M4 4h3.5l9 9M4 4v3.5l9 9M20 4h-3.5l-4 4M20 4v3.5l-4 4"/><path d="M14 17l3-3M16 15.5l3.5 3.5M7 14l3 3M8 15.5 4.5 19"/>',
    coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M14.5 9.3c-.4-.7-1.3-1.1-2.5-1.1-1.5 0-2.5.8-2.5 1.9 0 2.6 5.2 1.4 5.2 4 0 1.1-1.1 1.9-2.7 1.9-1.3 0-2.3-.5-2.7-1.3"/>',
    palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1 0 1.6-.7 1.6-1.5 0-1.1-.9-1.4-.9-2.4 0-.9.7-1.6 1.6-1.6h2a4.2 4.2 0 0 0 4.2-4.2c0-4-3.8-7.3-8.5-7.3z"/><path d="M7.6 11.5h.01M9.6 7.6h.01M14.4 7.6h.01M17 11h.01"/>',
    bag: '<path d="M5 8h14l-1.1 12.5H6.1z"/><path d="M9 10.5V7a3 3 0 0 1 6 0v3.5"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5s1.1-6.1 3.4-8.5z"/>',
    puzzle: '<path d="M4.5 8h3.7a2.1 2.1 0 1 1 4.1 0H16v3.7a2.1 2.1 0 1 1 0 4.1v3.7h-3.7a2.1 2.1 0 1 0-4.1 0H4.5v-3.7a2.1 2.1 0 1 0 0-4.1z"/>',
    lifebuoy: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.6"/><path d="M6 6l3.4 3.4M14.6 14.6 18 18M18 6l-3.4 3.4M9.4 14.6 6 18"/>',
    phone: '<path d="M5.5 4h3.3l1.8 4.6-2.2 1.4a11 11 0 0 0 5.6 5.6l1.4-2.2 4.6 1.8v3.3a2 2 0 0 1-2.1 2A16 16 0 0 1 3.5 6.1 2 2 0 0 1 5.5 4z"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>',
    chat: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9.5L4 20z"/><path d="M8.5 9h7M8.5 12h4.5"/>',
    sparkle: '<path d="M12 3.5l1.9 5.3 5.6 1.9-5.6 1.9L12 18l-1.9-5.4-5.6-1.9 5.6-1.9z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    shield: '<path d="M12 3.2l7.5 2.9v5.6c0 4.7-3.2 7.9-7.5 9.1-4.3-1.2-7.5-4.4-7.5-9.1V6.1z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.4"/>',
    arrow: '<path d="M19 12H5.5M11 6l-6 6 6 6"/>',
    chevron: '<path d="M6.5 9.5 12 15l5.5-5.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>'
  };

  /* 4 groups, 17 modules + overview. */
  const GROUPS = [
    {
      id: 'academy', title: 'پنل مدیریت', sub: 'آکادمی، بازیکنان و برنامه‌ها', icon: 'crown',
      items: [
        { slug: 'overview', title: 'نمای کلی', icon: 'overview', desc: 'خلاصهٔ وضعیت آکادمی' },
        { slug: 'academy-settings', title: 'تنظیمات آکادمی', icon: 'gear', desc: 'نام، لوگو، دامنه و پس‌زمینه‌ها' },
        { slug: 'players', title: 'بازیکنان', icon: 'players', desc: 'پروفایل، هندیکپ و وضعیت عضویت' },
        { slug: 'programs', title: 'دوره‌ها', icon: 'book', desc: 'برنامه‌ها و پلن‌های آموزشی' },
        { slug: 'calendar', title: 'تقویم', icon: 'calendar', desc: 'رویدادها و زمان‌بندی جلسات' },
        { slug: 'users', title: 'یوزرها', icon: 'user', desc: 'حساب‌ها، نقش‌ها و اشتراک‌ها' }
      ]
    },
    {
      id: 'competition', title: 'مسابقات', sub: 'زمین‌ها، رقابت‌ها و نتایج', icon: 'trophy',
      items: [
        { slug: 'courses', title: 'زمین‌ها', icon: 'flag', desc: 'زمین‌ها، پار و فاصلهٔ حفره‌ها' },
        { slug: 'tournaments', title: 'مسابقات', icon: 'trophy', desc: 'ساخت مسابقه، قوانین و جوایز' },
        { slug: 'results', title: 'نتایج', icon: 'chart', desc: 'کارت امتیاز و رده‌بندی' },
        { slug: 'battle', title: 'نبرد میدان‌ها', icon: 'swords', desc: 'رقابت تیمی میدان‌ها' }
      ]
    },
    {
      id: 'avatar', title: 'آواتار و فروشگاه', sub: 'سکه، آیتم‌ها و دنیای آواتار', icon: 'sparkle',
      items: [
        { slug: 'coin-requests', title: 'درخواست سکه', icon: 'coin', desc: 'تأیید و پرداخت سکه' },
        { slug: 'avatar-colors', title: 'رنگ و آواتار', icon: 'palette', desc: 'پوسته، رنگ رتبه و ظاهر' },
        { slug: 'avatar-shop', title: 'فروشگاه آواتار', icon: 'bag', desc: 'محصولات و قیمت‌گذاری سکه‌ای' },
        { slug: 'avatar-land', title: 'سرزمین آواتارها', icon: 'globe', desc: 'مکان‌ها و سبک نقشه' },
        { slug: 'items', title: 'ویرایش آیتم‌ها', icon: 'puzzle', desc: 'ساخت و ویرایش آیتم‌ها' }
      ]
    },
    {
      id: 'comms', title: 'ارتباطات', sub: 'پشتیبانی، تماس و اطلاعات', icon: 'chat',
      items: [
        { slug: 'support', title: 'پشتیبان', icon: 'lifebuoy', desc: 'پیام‌ها و درخواست‌های اعضا' },
        { slug: 'contact', title: 'تماس با ما', icon: 'phone', desc: 'راه‌های ارتباطی سایت' },
        { slug: 'info', title: 'اطلاعات', icon: 'info', desc: 'محتوای اطلاعات سایت' }
      ]
    }
  ];

  const DAILY = ['players', 'coin-requests', 'tournaments', 'results', 'calendar', 'programs', 'users', 'academy-settings'];

  const INDEX = {};
  GROUPS.forEach(group => group.items.forEach(item => { INDEX[item.slug] = { item, group }; }));
  const MODULE_COUNT = Object.keys(INDEX).length - 1;

  const faNum = new Intl.NumberFormat('fa-IR');
  const $ = (s, root = document) => root.querySelector(s);

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function icon(name, cls) {
    const span = el('span', cls || 'ico');
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 24 24" fill="none">' + (ICONS[name] || ICONS.grid) + '</svg>';
    return span;
  }
  function link(slug) { return slug === 'overview' ? '#/overview' : '#/m/' + slug; }

  const state = { mounted: false, openGroup: 'academy', stats: null, statsError: false, options: {} };

  /* ---------- sidebar ---------- */
  function renderNav(activeSlug) {
    const nav = $('#sideNav');
    if (!nav) return;
    nav.textContent = '';
    GROUPS.forEach(group => {
      const open = state.openGroup === group.id;
      const hasActive = group.items.some(i => i.slug === activeSlug);
      const box = el('section', 'nav-group' + (open ? ' is-open' : '') + (hasActive ? ' has-active' : ''));
      const head = el('button', 'nav-group-head');
      head.type = 'button';
      head.setAttribute('aria-expanded', String(open));
      head.setAttribute('aria-controls', 'grp-' + group.id);
      head.append(icon(group.icon, 'nav-group-icon'));
      const txt = el('span', 'nav-group-text');
      txt.append(el('b', '', group.title), el('small', '', group.sub));
      head.append(txt, icon('chevron', 'nav-chevron'));
      head.addEventListener('click', () => {
        state.openGroup = state.openGroup === group.id ? '' : group.id;
        renderNav(currentSlug());
      });
      const list = el('div', 'nav-items');
      list.id = 'grp-' + group.id;
      list.hidden = !open;
      group.items.forEach(item => {
        const a = el('a', 'nav-item' + (item.slug === activeSlug ? ' is-active' : ''));
        a.href = link(item.slug);
        if (item.slug === activeSlug) a.setAttribute('aria-current', 'page');
        a.append(icon(item.icon, 'nav-item-icon'), el('span', '', item.title));
        a.addEventListener('click', closeDrawer);
        list.append(a);
      });
      box.append(head, list);
      nav.append(box);
    });
  }

  /* ---------- shared blocks ---------- */
  function commandCard(slug) {
    const entry = INDEX[slug];
    if (!entry) return null;
    const a = el('a', 'cmd-card');
    a.href = link(slug);
    a.append(icon(entry.item.icon, 'cmd-icon'), el('b', 'cmd-title', entry.item.title), el('span', 'cmd-sub', entry.item.desc), icon('arrow', 'cmd-arrow'));
    return a;
  }

  function sectionCard(title, sub, pill) {
    const card = el('section', 'panel-card');
    const head = el('div', 'panel-card-head');
    const t = el('div');
    t.append(el('h2', '', title), el('p', '', sub));
    head.append(t);
    if (pill) head.append(el('span', 'panel-pill', pill));
    card.append(head);
    return card;
  }

  /* ---------- overview ---------- */
  function computeStats(store) {
    const arr = (v) => Array.isArray(v) ? v : [];
    const subs = arr(store.ga_subscriptions);
    const now = Date.now();
    const soon = subs.filter(s => {
      const end = Date.parse(s && (s.end_date || s.end_at));
      return Number.isFinite(end) && end - now < 30 * 864e5;
    }).length;
    return {
      subs: subs.length,
      soon,
      tournaments: arr(store.ga_tournaments).length,
      courses: arr(store.ga_courses).length,
      events: arr(store.ga_events).length
    };
  }

  function statCard(opts) {
    const card = el('article', 'stat-card' + (opts.alert ? ' is-alert' : ''));
    card.append(icon(opts.icon, 'stat-icon'));
    const value = el('strong', 'stat-value', opts.value);
    card.append(value, el('span', 'stat-label', opts.label));
    const a = el('a', 'stat-action');
    a.href = link(opts.slug);
    a.append(el('span', '', opts.action), icon('arrow', 'stat-action-ico'));
    card.append(a, el('i', 'stat-orb'));
    return card;
  }

  function renderOverview(root) {
    const hero = el('section', 'dash-hero');
    const copy = el('div', 'hero-copy');
    const h1 = el('h1');
    h1.append(icon('crown', 'hero-crown'), el('span', '', 'مرکز مدیریت آکادمی'));
    copy.append(h1, el('p', '', 'بازیکنان، مسابقات، فروشگاه آواتار و ارتباطات پات‌کلاب، همه در یک ساختار منظم'));
    const chips = el('div', 'hero-chips');
    const c1 = el('span', 'hero-chip', faNum.format(MODULE_COUNT) + ' بخش مدیریتی');
    const c2 = el('span', 'hero-chip is-ok');
    c2.append(icon('check', 'hero-chip-ico'), el('span', '', 'عملیات پایدار'));
    chips.append(c1, c2);
    if (state.options.preview) chips.append(el('span', 'hero-chip is-preview', 'پیش‌نمایش محلی'));
    copy.append(chips);
    hero.append(copy);
    root.append(hero);

    const stats = el('section', 'stat-grid');
    stats.setAttribute('aria-label', 'خلاصهٔ وضعیت');
    const s = state.stats;
    const v = (n) => (s ? faNum.format(n) : (state.statsError ? '—' : '…'));
    stats.append(
      statCard({ icon: 'user', value: v(s && s.subs), label: 'عضو دارای اشتراک', action: 'یوزرها', slug: 'users' }),
      statCard({ icon: 'shield', value: v(s && s.soon), label: 'اشتراک نزدیک به پایان (۳۰ روز)', action: 'پیگیری فوری', slug: 'users', alert: true }),
      statCard({ icon: 'trophy', value: v(s && s.tournaments), label: 'مسابقهٔ ثبت‌شده', action: 'مسابقات', slug: 'tournaments' }),
      statCard({ icon: 'flag', value: v(s && s.courses), label: 'زمین فعال', action: 'زمین‌ها', slug: 'courses' })
    );
    root.append(stats);
    if (state.statsError) root.append(el('p', 'soft-note', 'خلاصهٔ آمار در دسترس نبود؛ اتصال یا دسترسی را بررسی کنید.'));

    const daily = sectionCard('فرمان‌های روزانه', 'کارهای پرتکرار مدیر، بدون گم شدن بین تنظیمات', 'مرکز عملیات');
    const grid = el('div', 'cmd-grid');
    DAILY.forEach(slug => { const c = commandCard(slug); if (c) grid.append(c); });
    daily.append(grid);
    root.append(daily);

    GROUPS.slice(1).forEach(group => {
      const sec = sectionCard(group.title, group.sub, faNum.format(group.items.length) + ' بخش');
      const g = el('div', 'cmd-grid');
      group.items.forEach(item => g.append(commandCard(item.slug)));
      sec.append(g);
      root.append(sec);
    });
  }

  /* ---------- module page ---------- */
  function renderModule(root, slug) {
    const { item, group } = INDEX[slug];
    const head = el('section', 'module-hero');
    const crumbs = el('nav', 'crumbs');
    crumbs.setAttribute('aria-label', 'مسیر');
    const home = el('a', '', 'نمای کلی');
    home.href = '#/overview';
    crumbs.append(home, el('span', 'sep', '/'), el('span', '', group.title), el('span', 'sep', '/'), el('b', '', item.title));
    const row = el('div', 'module-hero-row');
    row.append(icon(item.icon, 'module-hero-icon'));
    const t = el('div');
    t.append(el('h1', '', item.title), el('p', '', item.desc));
    row.append(t, el('span', 'module-status', 'در حال آماده‌سازی'));
    head.append(crumbs, row);
    root.append(head);

    const body = el('section', 'panel-card module-empty');
    body.append(icon('grid', 'empty-ico'), el('h2', '', 'این بخش در منو ثبت شده است'), el('p', '', 'عملیات مدیریتی «' + item.title + '» هنوز پیاده‌سازی نشده است. ساختار منو، مسیر و دسترسی آماده است.'));
    const back = el('a', 'ghost-btn');
    back.href = '#/overview';
    back.append(icon('arrow', 'ghost-ico'), el('span', '', 'بازگشت به نمای کلی'));
    body.append(back);
    root.append(body);

    const siblings = group.items.filter(i => i.slug !== slug && i.slug !== 'overview');
    if (siblings.length) {
      const sec = sectionCard('سایر بخش‌های «' + group.title + '»', group.sub);
      const g = el('div', 'cmd-grid');
      siblings.forEach(i => g.append(commandCard(i.slug)));
      sec.append(g);
      root.append(sec);
    }
  }

  /* ---------- routing ---------- */
  function currentSlug() {
    const m = /^#\/m\/([a-z-]+)$/.exec(location.hash || '');
    return m && INDEX[m[1]] ? m[1] : 'overview';
  }

  function render() {
    const root = $('#dashContent');
    if (!root || $('#dashboardView').hidden) return;
    const slug = currentSlug();
    const entry = INDEX[slug];
    if (entry && state.openGroup !== entry.group.id && slug !== 'overview') state.openGroup = entry.group.id;
    renderNav(slug);
    root.textContent = '';
    if (slug === 'overview') renderOverview(root); else renderModule(root, slug);
    document.title = (slug === 'overview' ? 'کنسول مدیریت' : entry.item.title) + ' — پات‌کلاب';
  }

  /* ---------- mobile drawer ---------- */
  function closeDrawer() {
    const view = $('#dashboardView');
    if (!view) return;
    view.classList.remove('nav-open');
    const t = $('#navToggle');
    if (t) t.setAttribute('aria-expanded', 'false');
  }

  async function loadStats() {
    if (state.options.preview) {
      state.stats = { subs: 8, soon: 7, tournaments: 7, courses: 2, events: 25 };
      return render();
    }
    if (typeof state.options.loadStore !== 'function') return;
    try {
      state.stats = computeStats(await state.options.loadStore());
      state.statsError = false;
    } catch (_) {
      state.statsError = true;
    }
    if (currentSlug() === 'overview') render();
  }

  function mount(options) {
    state.options = options || {};
    state.stats = null;
    state.statsError = false;
    if (!state.mounted) {
      state.mounted = true;
      window.addEventListener('hashchange', () => { render(); const c = $('#dashContent'); if (c) { c.focus({ preventScroll: true }); window.scrollTo({ top: 0 }); } });
      const toggle = $('#navToggle');
      toggle.addEventListener('click', () => {
        const open = $('#dashboardView').classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      $('#navBackdrop').addEventListener('click', closeDrawer);
      document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
    }
    render();
    loadStats();
  }

  window.PuttDashboard = Object.freeze({ mount });
})();
