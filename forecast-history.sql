/* =========================================================
   ELECTIONLAB FORECAST HISTORY
   Safe additive update — does not delete existing data
   ========================================================= */


/* ---------------------------------------------------------
   1. FORECAST CHANGES TABLE
   --------------------------------------------------------- */

create table if not exists public.forecast_changes (
  id uuid primary key default gen_random_uuid(),

  race_id uuid not null
    references public.races(id)
    on delete cascade,

  old_rating text,
  new_rating text not null,

  old_projected_margin numeric,
  new_projected_margin numeric,

  reason text,
  notes text,

  status text not null default 'published'
    check (
      status in (
        'draft',
        'published'
      )
    ),

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz
    not null default now(),

  updated_at timestamptz
    not null default now()
);


/* ---------------------------------------------------------
   2. INDEXES
   --------------------------------------------------------- */

create index if not exists
  forecast_changes_race_id_index
on public.forecast_changes(race_id);


create index if not exists
  forecast_changes_created_at_index
on public.forecast_changes(created_at desc);


create index if not exists
  forecast_changes_status_index
on public.forecast_changes(status);


/* ---------------------------------------------------------
   3. UPDATED_AT TRIGGER FUNCTION
   --------------------------------------------------------- */

create or replace function
  public.set_forecast_change_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


/* ---------------------------------------------------------
   4. UPDATED_AT TRIGGER
   --------------------------------------------------------- */

drop trigger if exists
  forecast_changes_set_updated_at
on public.forecast_changes;


create trigger
  forecast_changes_set_updated_at
before update
on public.forecast_changes
for each row
execute function
  public.set_forecast_change_updated_at();


/* ---------------------------------------------------------
   5. ENABLE ROW LEVEL SECURITY
   --------------------------------------------------------- */

alter table
  public.forecast_changes
enable row level security;


/* ---------------------------------------------------------
   6. REMOVE OLD POLICIES IF THIS SQL IS RUN AGAIN
   --------------------------------------------------------- */

drop policy if exists
  "Public can read published forecast changes"
on public.forecast_changes;


drop policy if exists
  "Admins can read all forecast changes"
on public.forecast_changes;


drop policy if exists
  "Admins can insert forecast changes"
on public.forecast_changes;


drop policy if exists
  "Admins can update forecast changes"
on public.forecast_changes;


drop policy if exists
  "Admins can delete forecast changes"
on public.forecast_changes;


/* ---------------------------------------------------------
   7. PUBLIC READ POLICY
   --------------------------------------------------------- */

create policy
  "Public can read published forecast changes"
on public.forecast_changes
for select
to anon
using (
  status = 'published'
);


/* ---------------------------------------------------------
   8. ADMIN READ POLICY
   --------------------------------------------------------- */

create policy
  "Admins can read all forecast changes"
on public.forecast_changes
for select
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.user_id = auth.uid()
  )
);


/* ---------------------------------------------------------
   9. ADMIN INSERT POLICY
   --------------------------------------------------------- */

create policy
  "Admins can insert forecast changes"
on public.forecast_changes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admins
    where admins.user_id = auth.uid()
  )
);


/* ---------------------------------------------------------
   10. ADMIN UPDATE POLICY
   --------------------------------------------------------- */

create policy
  "Admins can update forecast changes"
on public.forecast_changes
for update
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admins
    where admins.user_id = auth.uid()
  )
);


/* ---------------------------------------------------------
   11. ADMIN DELETE POLICY
   --------------------------------------------------------- */

create policy
  "Admins can delete forecast changes"
on public.forecast_changes
for delete
to authenticated
using (
  exists (
    select 1
    from public.admins
    where admins.user_id = auth.uid()
  )
);


/* ---------------------------------------------------------
   12. OPTIONAL RACE FIELDS USED BY THE HOMEPAGE
   --------------------------------------------------------- */

alter table public.races
add column if not exists
  race_of_the_day boolean
  not null default false;


alter table public.races
add column if not exists
  candidate_to_watch boolean
  not null default false;


/* ---------------------------------------------------------
   13. ONLY ALLOW ONE RACE OF THE DAY
   --------------------------------------------------------- */

create unique index if not exists
  one_race_of_the_day_index
on public.races (
  race_of_the_day
)
where race_of_the_day = true;


/* ---------------------------------------------------------
   14. PUBLIC FORECAST HISTORY VIEW
   --------------------------------------------------------- */

create or replace view
  public.published_forecast_changes
with (
  security_invoker = true
)
as
select
  forecast_changes.id,
  forecast_changes.race_id,

  races.title as race_title,
  races.slug as race_slug,
  races.state,
  races.office,

  forecast_changes.old_rating,
  forecast_changes.new_rating,

  forecast_changes.old_projected_margin,
  forecast_changes.new_projected_margin,

  forecast_changes.reason,
  forecast_changes.notes,

  forecast_changes.created_at,
  forecast_changes.updated_at

from public.forecast_changes

join public.races
  on races.id =
     forecast_changes.race_id

where
  forecast_changes.status =
    'published'

and races.status =
    'published';


/* ---------------------------------------------------------
   15. GRANTS
   --------------------------------------------------------- */

grant select
on public.forecast_changes
to anon,
authenticated;


grant insert,
update,
delete
on public.forecast_changes
to authenticated;


grant select
on public.published_forecast_changes
to anon,
authenticated;


/* ---------------------------------------------------------
   DONE
   --------------------------------------------------------- */
