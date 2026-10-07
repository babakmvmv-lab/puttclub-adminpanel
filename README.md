# Putt Club Adminpanel — isolated prototype

This is a **separate project** for `adminpanel.puttclub.ir`. It does not modify the current `golf-academy-pro` repository, its `puttclub.ir` CNAME, the storefront, or any existing `ga_*` data.

## Current state

- Responsive Persian RTL login and empty academy-style shell are in `public/`.
- Exactly one golf-management photograph is used on the login screen.
- The post-login shell intentionally has an empty navigation container and no dashboard items; it only shows the Persian date and Tehran clock.
- The UI uses Supabase Auth plus the separate `public.adminpanel_access` table. `public/config.js` contains only the existing project's browser **publishable** key and URL; no service-role or management token is present.
- The additive migration in `supabase/adminpanel_schema.sql` has been applied to the confirmed Supabase project. It created a dedicated table, left all existing academy tables untouched, and grants an authenticated user read access only to their own role row. One active owner row is linked to the supplied admin email; anonymous REST access returned HTTP 401.
- `.github/workflows/deploy-pages.yml` deploys only `public/`; the local dashboard preview under `dev/` is not included in the Pages artifact.
- `public/CNAME` prepares the new site for `adminpanel.puttclub.ir`; the deSEC DNS record and GitHub Pages site are still pending.

## Before public deployment

1. Create a separate GitHub repository (suggested: `puttclub-adminpanel`), enable Pages with the Actions source, and deploy this project.
2. Add the `adminpanel` CNAME in deSEC pointing to the GitHub Pages account host; verify DNS and HTTPS before telling users to sign in.
3. Test the supplied owner's email/password with the new page; the website does not store the password, and Supabase Auth validates it server-side.
4. For a later move to your own host, copy `public/`, configure TLS, and change only the subdomain DNS target. Never put a service-role key, GitHub PAT, or deSEC token in browser files or Git history.

The existing academy remains untouched while this new site is built. When moving from GitHub Pages to the eventual self-hosted server, copy `public/` and change only the subdomain's DNS target and TLS setup.

## Local preview

```sh
python3 dev/server.py
```

The root route serves the login-design preview. `/__preview` shows the empty post-login shell without connecting to Auth or Supabase. This development route is implemented only by the local preview server and is never published by the Pages workflow.
