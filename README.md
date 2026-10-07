# Putt Club Adminpanel — isolated project

This is a **separate project** for `adminpanel.puttclub.ir`. It does not modify the current `golf-academy-pro` repository, its `puttclub.ir` CNAME, the storefront, or any existing `ga_*` data.

## Current state

- The login keeps the approved split-screen layout, golf photograph, responsive behavior, and Persian RTL typography. Vazirmatn variable font files (Arabic and Latin subsets, SIL Open Font License) are hosted locally.
- **Academy management lives here now.** Every management item of panel.puttclub.ir is available in the console and runs the *same academy code* (built from `golf-academy-pro`, exactly like the panel) inside a same-origin frame at `/academy/`. Both panels read and write the same cloud store (`ga_store` via `ga-sync`), so a change made here appears in panel.puttclub.ir (after it reloads) and vice-versa. The panel itself is untouched and keeps working.
- Sidebar groups (six): پنل مدیریت (نمای کلی، تنظیمات آکادمی، بازیکنان، دوره‌ها، تقویم، رسپشن) · مسابقات (زمین‌ها، مسابقات، نتایج، نبرد میدان‌ها) · آواتار و فروشگاه (درخواست سکه، رنک و آواتار، فروشگاه آواتار، سرزمین آواتارها، ویرایش آیتم‌ها) · ارتباطات (تماس با ما، اطلاعات، ارسال پیام) · حساب‌ها و سیستم (یوزرها، اشتراک‌ها، تنظیمات نمایش، پشتیبان آکادمی) · داشبورد آکادمی (all 11 display pages). Menu data: `public/dashboard.js`.
- Bridge: `academy-bridge/pre.js` (gate: the frame only runs inside the signed-in shell, opens the academy session as the main admin, keeps history clean), `post.js` (`PUTT_BRIDGE.open(page, tab)`, cloud status/pull, reports in-app navigation back to the shell), `theme.css` (hides academy chrome, applies the forest/gold console palette). `tools/build_academy.py` injects them; CI builds it on every deploy and daily at 03:47 UTC so the console follows academy code changes.
- Sync status is shown in the module bar and sidebar (همگام / در صف ارسال / خطا). Opening a module pulls the latest cloud data first (throttled); the ↻ button forces a pull.
- **panel.puttclub.ir is members-only (done 2026-10-07).** All 22 management items (17 «پنل مدیریت» tabs + یوزرها، اشتراک‌ها، تنظیمات نمایش، پشتیبان آکادمی، ارسال پیام) were verified identical here (render + writes, `dev/parity/`) and then removed from the panel one commit per item (repo `golf-academy-panel`, `members-only/moved.json`). The panel now shows only «داشبورد»; management lives only in this console. Restoring an item there = revert its commit.
- Device-local keys (`ga_users`, `ga_player_users`, `ga_backup_slots`) never sync by academy design. So that «یوزرها»/«پشتیبان آکادمی» here manage the *same* list the panel uses for login on this device, `public/device-bridge.js` opens `https://panel.puttclub.ir/admin-bridge.html` in a hidden iframe (same site → same first-party storage) and mirrors those three keys both ways; the panel's copy wins, and any previous console-only value is kept under `putt_prev_<key>`. If the bridge fails, the console shows a banner and works as before (edits stay on this browser only). Configure with `panelBridgeUrl` in `config.js` (local dev: `PANEL_BRIDGE_URL`).
- The academy session here is opened as the panel's main admin (or the first active admin) from that shared list; the console no longer creates accounts itself. Known limitation inherited from the academy: accounts and passwords stay device-local — moving them to Supabase Auth is the proposed next phase.
- The overview cards read a small, read-only summary from `ga_store`. The access token is refreshed automatically while the console stays open.
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
git clone --depth 1 https://github.com/babakmvmv-lab/golf-academy-pro.git /tmp/main
python3 tools/build_academy.py --src /tmp/main      # builds public/academy (git-ignored)
python3 dev/server.py
```

The root route serves the login-design preview with an intentionally blank local `config.js`, so it cannot call Supabase or authenticate. `/__preview` serves the same `index.html` with a local-only flag that opens the console with demo numbers, without connecting to Auth or Supabase (the flag is ignored whenever Supabase is configured); in the preview the embedded academy is read-only — cloud writes are blocked; the preview server and route are local-only and are never published by the Pages workflow.
