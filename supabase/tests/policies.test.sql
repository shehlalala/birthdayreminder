-- Row Level Security and constraint tests. Run with scripts/test-db.sh.
\set ON_ERROR_STOP on
\set QUIET on

create function pg_temp.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

-- Runs sql and passes only if it raises an error whose message matches pattern.
create function pg_temp.throws(sql text, pattern text, msg text) returns void language plpgsql as $$
begin
  execute sql;
  raise exception 'FAIL: % (no error)', msg;
exception when others then
  if sqlerrm like 'FAIL:%' then raise; end if;
  if sqlerrm !~* pattern then raise exception 'FAIL: % (unexpected error: %)', msg, sqlerrm; end if;
  raise notice 'ok - %', msg;
end $$;

grant execute on function pg_temp.ok(boolean, text), pg_temp.throws(text, text, text) to anon, authenticated;

insert into auth.users (id, is_anonymous) values
  ('aaaaaaaa-0000-0000-0000-000000000000', true),
  ('bbbbbbbb-0000-0000-0000-000000000000', false);

-- Every table in public must have RLS on. Guards future migrations too.
select pg_temp.ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
), 'every public table has RLS enabled');

-- ---- User A (anonymous) creates data -------------------------------------
set role authenticated;
set request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}';

insert into public.people (id, name, birth_day, birth_month, relation_key, created_at, updated_at)
values ('11111111-0000-0000-0000-000000000000', 'Leyla', 12, 5, 'friend', now(), '2026-01-01T00:00:00Z');
insert into public.reminders (id, person_id, days_before, created_at, updated_at)
values ('22222222-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000000', 7, now(), now());
insert into public.gift_ideas (id, person_id, title, created_at, updated_at)
values ('33333333-0000-0000-0000-000000000000', '11111111-0000-0000-0000-000000000000', 'Book', now(), now());
insert into public.user_settings (created_at, updated_at) values (now(), now());

select pg_temp.ok((select user_id from public.people) = 'aaaaaaaa-0000-0000-0000-000000000000',
  'user_id defaults to auth.uid() for an anonymous user');
select pg_temp.ok((select count(*) from public.people) = 1, 'owner sees own person');

-- ---- Last write wins -----------------------------------------------------
update public.people set name = 'Old write', updated_at = '2025-12-31T00:00:00Z'
  where id = '11111111-0000-0000-0000-000000000000';
select pg_temp.ok((select name from public.people) = 'Leyla', 'update with older updated_at is skipped');

update public.people set name = 'Leyla K', updated_at = '2026-01-02T00:00:00Z'
  where id = '11111111-0000-0000-0000-000000000000';
select pg_temp.ok((select name from public.people) = 'Leyla K', 'update with newer updated_at applies');

-- Upsert path used by sync goes through the same guard.
insert into public.people (id, name, birth_day, birth_month, created_at, updated_at)
values ('11111111-0000-0000-0000-000000000000', 'Stale upsert', 12, 5, now(), '2025-01-01T00:00:00Z')
on conflict (id) do update set name = excluded.name, updated_at = excluded.updated_at;
select pg_temp.ok((select name from public.people) = 'Leyla K', 'stale upsert is skipped');

update public.people set synced_at = '2000-01-01', updated_at = '2026-01-03T00:00:00Z';
select pg_temp.ok((select synced_at from public.people) > '2020-01-01', 'clients cannot set synced_at');

-- ---- Constraints ----------------------------------------------------------
select pg_temp.throws($$insert into public.people (id, name, birth_day, birth_month, created_at, updated_at)
  values (gen_random_uuid(), 'X', 30, 2, now(), now())$$, 'people_valid_day', 'Feb 30 rejected');
select pg_temp.throws($$insert into public.people (id, name, birth_day, birth_month, birth_year, created_at, updated_at)
  values (gen_random_uuid(), 'X', 29, 2, 2023, now(), now())$$, 'people_feb29_needs_leap_year', 'Feb 29 in a non-leap year rejected');
insert into public.people (id, name, birth_day, birth_month, birth_year, created_at, updated_at)
  values (gen_random_uuid(), 'Leap', 29, 2, 2000, now(), now());
insert into public.people (id, name, birth_day, birth_month, created_at, updated_at)
  values (gen_random_uuid(), 'Leap no year', 29, 2, now(), now());
select pg_temp.ok(true, 'Feb 29 accepted with leap year or no year');
select pg_temp.throws($$insert into public.people (id, name, birth_day, birth_month, relation_key, relation_custom, created_at, updated_at)
  values (gen_random_uuid(), 'X', 1, 1, 'mom', 'Auntie', now(), now())$$, 'people_one_relation', 'preset and custom relation are exclusive');
select pg_temp.throws($$insert into public.people (id, name, birth_day, birth_month, created_at, updated_at)
  values (gen_random_uuid(), '   ', 1, 1, now(), now())$$, 'check constraint', 'blank name rejected');

-- ---- User B cannot see or touch A's data ---------------------------------
set request.jwt.claims = '{"sub":"bbbbbbbb-0000-0000-0000-000000000000","role":"authenticated"}';

select pg_temp.ok((select count(*) from public.people) = 0, 'B sees no people of A');
select pg_temp.ok((select count(*) from public.reminders) = 0, 'B sees no reminders of A');
select pg_temp.ok((select count(*) from public.gift_ideas) = 0, 'B sees no gift ideas of A');
select pg_temp.ok((select count(*) from public.user_settings) = 0, 'B sees no settings of A');

with u as (update public.people set name = 'hacked' where true returning 1)
select pg_temp.ok((select count(*) from u) = 0, 'B cannot update A''s people');
with d as (delete from public.gift_ideas where true returning 1)
select pg_temp.ok((select count(*) from d) = 0, 'B cannot delete A''s gift ideas');

select pg_temp.throws($$insert into public.people (id, user_id, name, birth_day, birth_month, created_at, updated_at)
  values (gen_random_uuid(), 'aaaaaaaa-0000-0000-0000-000000000000', 'Planted', 1, 1, now(), now())$$,
  'row-level security', 'B cannot insert rows owned by A');
select pg_temp.throws($$insert into public.reminders (id, person_id, days_before, created_at, updated_at)
  values (gen_random_uuid(), '11111111-0000-0000-0000-000000000000', 1, now(), now())$$,
  'foreign key', 'B cannot attach a reminder to A''s person');
select pg_temp.throws($$insert into public.people (id, name, birth_day, birth_month, created_at, updated_at)
  values ('11111111-0000-0000-0000-000000000000', 'Take over', 1, 1, now(), now())
  on conflict (id) do update set name = excluded.name$$,
  'row-level security|duplicate key', 'B cannot take over A''s row id via upsert');

-- ---- Storage ---------------------------------------------------------------
insert into storage.objects (bucket_id, name) values ('photos', 'bbbbbbbb-0000-0000-0000-000000000000/p.jpg');
select pg_temp.ok(true, 'B can upload into own photo folder');
select pg_temp.throws($$insert into storage.objects (bucket_id, name)
  values ('photos', 'aaaaaaaa-0000-0000-0000-000000000000/p.jpg')$$,
  'row-level security', 'B cannot upload into A''s photo folder');
select pg_temp.throws($$insert into storage.objects (bucket_id, name) values ('photos', 'p.jpg')$$,
  'row-level security', 'uploads outside a user folder are rejected');
set request.jwt.claims = '{"sub":"aaaaaaaa-0000-0000-0000-000000000000","role":"authenticated"}';
select pg_temp.ok((select count(*) from storage.objects) = 0, 'A cannot see B''s photos');

-- ---- Signed-out requests ---------------------------------------------------
reset role;
set role anon;
reset request.jwt.claims;
select pg_temp.throws('select * from public.people', 'permission denied', 'anon cannot read people');
select pg_temp.throws('select * from public.user_settings', 'permission denied', 'anon cannot read settings');

-- ---- Account deletion cascades ----------------------------------------------
reset role;
delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000000';
select pg_temp.ok(
  (select count(*) from public.people where user_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 0
  and (select count(*) from public.reminders) = 0
  and (select count(*) from public.gift_ideas) = 0
  and (select count(*) from public.user_settings where user_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 0,
  'deleting the auth user deletes all their rows');

\echo 'All policy tests passed.'
