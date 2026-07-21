
-- ElectionLab 2026 Senate CMS
create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.races (
  id uuid primary key default gen_random_uuid(),
  state text not null,
  title text not null,
  slug text not null unique,
  rating text not null default 'Toss-up',
  projected_margin numeric not null default 0,
  summary text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  name text not null,
  party text not null check (party in ('D','R','I')),
  incumbent boolean not null default false,
  win_probability numeric not null default 50 check (win_probability between 0 and 100),
  expected_vote_share numeric not null default 50 check (expected_vote_share between 0 and 100),
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.races(id) on delete cascade,
  pollster text not null,
  start_date date not null,
  end_date date not null,
  sample_size integer not null check (sample_size > 0),
  population text not null default 'LV' check (population in ('LV','RV','A')),
  dem_pct numeric not null check (dem_pct between 0 and 100),
  rep_pct numeric not null check (rep_pct between 0 and 100),
  quality_weight numeric not null default 1 check (quality_weight between .25 and 2),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
alter table public.races enable row level security;
alter table public.candidates enable row level security;
alter table public.polls enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admins where user_id=auth.uid()) $$;

drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select to authenticated using (user_id=auth.uid());

drop policy if exists "public reads published races" on public.races;
create policy "public reads published races" on public.races for select to anon, authenticated using (status='published' or public.is_admin());
drop policy if exists "admin manages races" on public.races;
create policy "admin manages races" on public.races for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public reads candidates of published races" on public.candidates;
create policy "public reads candidates of published races" on public.candidates for select to anon, authenticated
using (public.is_admin() or exists(select 1 from public.races r where r.id=race_id and r.status='published'));
drop policy if exists "admin manages candidates" on public.candidates;
create policy "admin manages candidates" on public.candidates for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public reads published polls" on public.polls;
create policy "public reads published polls" on public.polls for select to anon, authenticated
using (status='published' or public.is_admin());
drop policy if exists "admin manages polls" on public.polls;
create policy "admin manages polls" on public.polls for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.races, public.candidates, public.polls to anon;
grant select, insert, update, delete on public.races, public.candidates, public.polls to authenticated;
grant select on public.admins to authenticated;

-- AFTER creating your user in Authentication > Users, replace the UUID below,
-- remove the two dashes, and run that one line:
-- insert into public.admins(user_id) values ('YOUR-AUTH-USER-UUID');
