-- Initial schema: people, reminders, gift ideas, user settings, photo storage.
--
-- Sync model (see src/data/sync.ts):
--   * Row ids are UUIDs generated on the device, so rows can be created offline.
--   * updated_at is set by the device. Last write wins: an update carrying an
--     older updated_at than the stored row is silently skipped (sync_guard).
--   * synced_at is set by the server on every write and is the pull cursor.
--     Clients cannot set it.
--   * Deletes are soft (deleted_at) so they reach other devices.
--   * Every table has RLS: a user can only touch rows where user_id = auth.uid().
--     Anonymous users have the `authenticated` role, so the same policies apply.

-- ---------------------------------------------------------------------------
-- Shared trigger
-- ---------------------------------------------------------------------------

create function public.sync_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null; -- an older write loses; keep the stored row
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- people
-- ---------------------------------------------------------------------------

create table public.people (
  id              uuid primary key,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 100),
  birth_day       smallint not null,
  birth_month     smallint not null check (birth_month between 1 and 12),
  birth_year      smallint check (birth_year between 1900 and 2100),
  -- Preset key from content/relations.ts (translated in the app) or free text.
  relation_key    text check (relation_key ~ '^[a-zA-Z]{1,30}$'),
  relation_custom text check (char_length(relation_custom) between 1 and 50),
  photo_path      text check (char_length(photo_path) <= 300),
  note            text check (char_length(note) <= 500),
  reminder_time   time, -- per-person override of user_settings.reminder_time
  created_at      timestamptz not null,
  updated_at      timestamptz not null,
  deleted_at      timestamptz,
  synced_at       timestamptz not null default clock_timestamp(),

  unique (id, user_id), -- target for child foreign keys, so children can't point at another user's person
  constraint people_one_relation check (relation_key is null or relation_custom is null),
  constraint people_valid_day check (
    birth_day between 1 and case birth_month
      when 2 then 29
      when 4 then 30 when 6 then 30 when 9 then 30 when 11 then 30
      else 31
    end
  ),
  constraint people_feb29_needs_leap_year check (
    not (birth_month = 2 and birth_day = 29 and birth_year is not null
         and not (birth_year % 4 = 0 and (birth_year % 100 <> 0 or birth_year % 400 = 0)))
  )
);

create index people_user_synced on public.people (user_id, synced_at, id);

-- ---------------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------------

create table public.reminders (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_id   uuid not null,
  days_before smallint not null check (days_before between 0 and 365),
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz,
  synced_at   timestamptz not null default clock_timestamp(),

  foreign key (person_id, user_id) references public.people (id, user_id) on delete cascade
);

create index reminders_user_synced on public.reminders (user_id, synced_at, id);
create index reminders_person on public.reminders (person_id);

-- ---------------------------------------------------------------------------
-- gift_ideas
-- ---------------------------------------------------------------------------

create table public.gift_ideas (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_id   uuid not null,
  title       text not null check (char_length(btrim(title)) between 1 and 200),
  note        text check (char_length(note) <= 1000),
  url         text check (char_length(url) <= 2000),
  price       numeric(12, 2) check (price >= 0),
  bought      boolean not null default false,
  given_year  smallint check (given_year between 1900 and 2100),
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  deleted_at  timestamptz,
  synced_at   timestamptz not null default clock_timestamp(),

  foreign key (person_id, user_id) references public.people (id, user_id) on delete cascade
);

create index gift_ideas_user_synced on public.gift_ideas (user_id, synced_at, id);
create index gift_ideas_person on public.gift_ideas (person_id);

-- ---------------------------------------------------------------------------
-- user_settings (one row per user)
-- ---------------------------------------------------------------------------

create table public.user_settings (
  user_id               uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  reminder_time         time not null default '09:00',
  default_reminder_days smallint[] not null default '{0,7}'
                        check (cardinality(default_reminder_days) <= 10
                               and 0 <= all (default_reminder_days)
                               and 365 >= all (default_reminder_days)),
  created_at            timestamptz not null,
  updated_at            timestamptz not null,
  synced_at             timestamptz not null default clock_timestamp()
);

-- ---------------------------------------------------------------------------
-- Triggers, RLS, grants
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['people', 'reminders', 'gift_ideas', 'user_settings'] loop
    execute format(
      'create trigger sync_guard before insert or update on public.%I
         for each row execute function public.sync_guard()', t);

    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy "owner can do everything" on public.%I
         for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);

    -- Signed-out requests get nothing at all, not even an empty result.
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Photos: private bucket, one folder per user ("<user_id>/<person_id>.jpg").
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/heic'])
on conflict (id) do nothing;

create policy "photos: owner folder only" on storage.objects
  for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
