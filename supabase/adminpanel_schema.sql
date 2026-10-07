-- Adminpanel-only access registry.
-- Deliberately separate from every existing academy ga_* table.
-- Review the target Supabase project before applying this migration.

begin;

create table if not exists public.adminpanel_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.adminpanel_access enable row level security;

revoke all on table public.adminpanel_access from anon, authenticated;
grant select on table public.adminpanel_access to authenticated;

drop policy if exists "adminpanel users may read their own access" on public.adminpanel_access;
create policy "adminpanel users may read their own access"
  on public.adminpanel_access
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No client-side INSERT, UPDATE, or DELETE policies are created.
-- Provision the initial owner through the Supabase dashboard/SQL editor after
-- creating the Auth user; never store that user's password in this table.

commit;
