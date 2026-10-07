# Putt Club Adminpanel — isolated project

This is a **separate project** for `adminpanel.puttclub.ir`. It does not modify the current `golf-academy-pro` repository, its `puttclub.ir` CNAME, the storefront, or any existing `ga_*` data.

## Current state

- The login keeps the approved split-screen layout, golf photograph, responsive behavior, and Persian RTL typography. Vazirmatn variable font files (Arabic and Latin subsets, SIL Open Font License) are hosted locally.
- The post-login shell follows the latest supplied dashboard reference: `پنل مدیریت` and its breadcrumb align right; the left side has `فعال`, Tehran time, Jalali date, and a browser connectivity indicator. Account identity and sign-out remain available in the header.
- The RTL menu card contains all 17 requested entries: تنظیمات آکادمی، بازیکنان، زمین‌ها، مسابقات، دوره‌ها، نتایج، تقویم، پشتیبان، تماس با ما، اطلاعات، یوزرها، درخواست سکه، رنگ و آواتار، فروشگاه آواتار، نبرد میدان‌ها، سرزمین آواتارها، ویرایش آیتم‌ها. The responsive tile layout wraps for tablet and mobile. Selecting an entry changes the preview state only; module operations and sensitive reset/payment actions are not implemented.
- The UI uses Supabase Auth plus the separate `public.adminpanel_access` table. `public/config.js` contains only the existing project's browser **publishable** key and URL; no service-role or management token is present.
- The additive migration in `supabase/adminpanel_schema.sql` was applied to the confirmed Supabase project. It created a dedicated table, left existing academy tables untouched, and grants an authenticated user read access only to their own role row. One active owner row is linked to `Admin@puttclub.ir`; anonymous REST access returned HTTP 401. The account password was not collected or stored by this project.
- GitHub Pages is configured for Actions in the separate public repository `babakmvmv-lab/puttclub-adminpanel`. The workflow deploys only `public/`; local preview files under `dev/` are not included. The latest published commit before this dashboard update is `47c6bbd`; its GitHub Actions deployment completed successfully.
- The deSEC CNAME for `adminpanel.puttclub.ir` points to `babakmvmv-lab.github.io.` and is visible through Google and Cloudflare public DNS. GitHub Pages reports the domain valid and serving Pages; its TLS certificate is approved through `2027-01-05`, and HTTPS enforcement is enabled. A normal TLS-verified request to `https://adminpanel.puttclub.ir/` returned HTTP 200; HTTP requests redirect to HTTPS. The login form also refuses non-HTTPS public origins.
- The Auth account and active owner authorization row exist, but end-to-end sign-in was not tested because no password was shared or stored.

## Remaining launch checks

1. Sign in at `https://adminpanel.puttclub.ir` with the owner's account. Supabase Auth validates the password server-side; the site never stores it. If needed, use Supabase's secure password-reset flow yourself.
2. For a later move to your own host, copy `public/`, configure TLS, and change only the subdomain DNS target. Keep the academy repository and existing data untouched.

Never put a service-role key, GitHub PAT, or DNS-provider token in browser files or Git history.

## Local preview

```sh
python3 dev/server.py
```

The root route serves the login-design preview with an intentionally blank local `config.js`, so it cannot call Supabase or authenticate. `/__preview` shows the responsive post-login header, status chips, and all 17 menu entries without connecting to Auth or Supabase. Menu selection displays a non-operational placeholder; the preview server and route are local-only and are never published by the Pages workflow.
