# Putt Club Adminpanel — isolated project

This is a **separate project** for `adminpanel.puttclub.ir`. It does not modify the current `golf-academy-pro` repository, its `puttclub.ir` CNAME, the storefront, or any existing `ga_*` data.

## Current state

- Responsive Persian RTL login and empty academy-style shell are in `public/`.
- Exactly one golf-management photograph is used on the login screen.
- The post-login shell intentionally has an empty navigation container and no dashboard items; it shows the Persian date and Tehran clock.
- The UI uses Supabase Auth plus the separate `public.adminpanel_access` table. `public/config.js` contains only the existing project's browser **publishable** key and URL; no service-role or management token is present.
- The additive migration in `supabase/adminpanel_schema.sql` was applied to the confirmed Supabase project. It created a dedicated table, left existing academy tables untouched, and grants an authenticated user read access only to their own role row. One active owner row is linked to `Admin@puttclub.ir`; anonymous REST access returned HTTP 401. The account password was not collected or stored by this project.
- GitHub Pages is configured for Actions in the separate public repository `babakmvmv-lab/puttclub-adminpanel`. The workflow deploys only `public/`; the local dashboard preview under `dev/` is not included. The first deployment completed successfully from commit `89d3991`.
- The deSEC CNAME for `adminpanel.puttclub.ir` points to `babakmvmv-lab.github.io.` and is visible through public DNS. The site responds over HTTP, but GitHub has not issued a matching HTTPS certificate yet. **Do not enter real credentials until HTTPS has a valid certificate and is verified.**

## Remaining launch checks

1. Wait for GitHub Pages to provision the custom-domain certificate, then verify `https://adminpanel.puttclub.ir` with normal certificate validation and enable HTTPS enforcement in Pages.
2. Test real sign-in directly on the HTTPS site with the owner's account. The website never stores the password; Supabase Auth validates it server-side. If needed, use Supabase's secure password-reset flow yourself.
3. For a later move to your own host, copy `public/`, configure TLS, and change only the subdomain DNS target. Keep the academy repository and existing data untouched.

Never put a service-role key, GitHub PAT, or DNS-provider token in browser files or Git history.

## Local preview

```sh
python3 dev/server.py
```

The root route serves the login-design preview. `/__preview` shows the empty post-login shell without connecting to Auth or Supabase. This development route is implemented only by the local preview server and is never published by the Pages workflow.
