# Putt Club Adminpanel — isolated project

This is a **separate project** for `adminpanel.puttclub.ir`. It does not modify the current `golf-academy-pro` repository, its `puttclub.ir` CNAME, the storefront, or any existing `ga_*` data.

## Current state

- The login uses a premium split-screen layout inspired by the supplied reference: one golf-management photograph on the left and a clean, full-height sign-in panel on the right. The empty academy-style shell remains responsive and Persian RTL.
- Persian UI typography uses a locally hosted Vazirmatn variable font (Arabic and Latin subsets, SIL Open Font License) for crisp weights and consistent rendering without a third-party font request.
- The post-login shell intentionally has an empty navigation container and no dashboard items; it shows the Persian date and Tehran clock.
- The UI uses Supabase Auth plus the separate `public.adminpanel_access` table. `public/config.js` contains only the existing project's browser **publishable** key and URL; no service-role or management token is present.
- The additive migration in `supabase/adminpanel_schema.sql` was applied to the confirmed Supabase project. It created a dedicated table, left existing academy tables untouched, and grants an authenticated user read access only to their own role row. One active owner row is linked to `Admin@puttclub.ir`; anonymous REST access returned HTTP 401. The account password was not collected or stored by this project.
- GitHub Pages is configured for Actions in the separate public repository `babakmvmv-lab/puttclub-adminpanel`. The workflow deploys only `public/`; the local dashboard preview under `dev/` is not included. Initial deployment `89d3991`, secure-transport update `c910ac0`, and the reference-inspired design/font refresh `9d0e65b` all completed successfully.
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

The root route serves the login-design preview with an intentionally blank local `config.js`, so it cannot call Supabase or authenticate. `/__preview` shows the empty post-login shell without connecting to Auth or Supabase. The preview server and route are local-only and are never published by the Pages workflow.
