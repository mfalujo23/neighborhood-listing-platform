-- PREPARED FOR APPROVED NEW emzgyjdasctljwnbcuov ONLY.
-- Requires completed real strict-six Auth/PostgREST phase and coordinator
-- visual project assertion. Fictional classroom data only; no real approval.
begin;
-- New approved emzgyjdasctljwnbcuov only; dashboard project identity is a
-- coordinator check. SQL cannot infer a Supabase project reference reliably.
-- 2026-11-19 is rendered only after the real strict-six Auth phase passes.
do $core_fixture_guard$
declare
  a uuid; b uuid; adm uuid; cl uuid; mer uuid; ap uuid; ad uuid; bd uuid; cat uuid;
  expected_seed_date date := date '2026-11-19';
begin
  if to_regclass('auth.users') is null or to_regprocedure('auth.uid()') is null then
    raise exception using errcode='55000',message='MANAGED_AUTH_REQUIRED';
  end if;
  if (select count(*) from auth.users)<>5 or (select count(*) from public.profiles)<>5
    or (select count(*) from public.properties)<>3 or (select count(*) from public.services)<>3
    or (select count(*) from public.service_categories)<>2
    or (select count(*) from public.service_category_mappings)<>2
    or (select count(*) from public.bookings)<>1 then
    raise exception using errcode='55000',message='EXACT_RESTORED_CORE_FIXTURE_REQUIRED';
  end if;
  select u.id into strict a from auth.users u join public.profiles p on p.id=u.id
    where u.email='cis3610-provider-a@example.test' and p.email=u.email and p.role='provider';
  select u.id into strict b from auth.users u join public.profiles p on p.id=u.id
    where u.email='cis3610-provider-b@example.test' and p.email=u.email and p.role='provider';
  select u.id into strict adm from auth.users u join public.profiles p on p.id=u.id
    where u.email='cis3610-admin@example.test' and p.email=u.email and p.role='admin';
  select u.id into strict cl from auth.users u join public.profiles p on p.id=u.id
    where u.email='cis3610-client@example.test' and p.email=u.email and p.role='client';
  select u.id into strict mer from auth.users u join public.profiles p on p.id=u.id
    where u.email='cis3610-merchant@example.test' and p.email=u.email and p.role='merchant';
  if (select count(distinct id) from unnest(array[a,b,adm,cl,mer]) t(id))<>5 then
    raise exception using errcode='55000',message='FIVE_ACTUAL_MANAGED_IDENTITIES_REQUIRED';
  end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in ('profiles','properties','services','service_categories','service_category_mappings','bookings')
        and c.relkind='r' and c.relrowsecurity)<>6
    or has_table_privilege('anon','public.bookings','SELECT')
    or not has_table_privilege('anon','public.bookings','INSERT')
    or has_table_privilege('authenticated','public.profiles','UPDATE') then
    raise exception using errcode='55000',message='CORE_RLS_OR_GRANTS_NOT_VERIFIED';
  end if;
  if (select count(*) from public.services where
      (provider_id=a and title='Fictional home inspection' and hourly_rate=75 and duration_minutes=60 and coverage_radius_miles=10 and status='approved' and coverage_active)
      or (provider_id=a and title='Fictional Provider A draft' and hourly_rate=50 and duration_minutes=60 and coverage_radius_miles=5 and status='draft' and coverage_active)
      or (provider_id=b and title='Fictional Provider B draft' and hourly_rate=60 and duration_minutes=30 and coverage_radius_miles=5 and status='draft' and coverage_active))<>3 then
    raise exception using errcode='55000',message='CORE_SERVICE_FIXTURE_CHANGED';
  end if;
  if (select count(*) from public.properties where city='Test City' and state='CA' and zip_code='90032' and (
      (owner_id=a and title='Fictional approved listing' and approved and street='20 Example Way' and price=600000 and bedrooms=3 and bathrooms=2 and square_feet=1200)
      or (owner_id=a and title='Fictional Provider A draft' and not approved and street='10 Example Way' and price=500000 and bedrooms=2 and bathrooms=1 and square_feet=900)
      or (owner_id=b and title='Fictional Provider B draft' and not approved and street='30 Example Way' and price=700000 and bedrooms=3 and bathrooms=2 and square_feet=1400)))<>3 then
    raise exception using errcode='55000',message='CORE_PROPERTY_FIXTURE_CHANGED';
  end if;
  if (select count(*) from public.service_categories where
      (name='Fictional home services' and slug='fictional-home-services' and active_status)
      or (name='Fictional archived category' and slug='fictional-archived' and not active_status))<>2 then
    raise exception using errcode='55000',message='CORE_CATEGORY_FIXTURE_CHANGED';
  end if;
  select id into strict ap from public.services where provider_id=a and status='approved';
  select id into strict ad from public.services where provider_id=a and status='draft';
  select id into strict bd from public.services where provider_id=b and status='draft';
  select id into strict cat from public.service_categories where active_status;
  if (select count(*) from public.service_category_mappings where service_id in (ap,ad) and category_id=cat)<>2
    or (select count(*) from public.bookings where service_id=ap and client_email='fictional-booking@example.test'
      and requested_date=expected_seed_date+7 and notes='Fictional seeded booking for authorization verification.')<>1 then
    raise exception using errcode='55000',message='CORE_MAPPING_OR_BOOKING_FIXTURE_CHANGED';
  end if;
end
$core_fixture_guard$;

do $addon_target_guard$ begin
  if to_regclass('public.telephony_webhook_events') is not null then
    raise exception using errcode='55000',message='ADDON_TARGET_ALREADY_EXISTS_NO_OVERWRITE';
  end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v','m','f')
      and c.relname not in ('profiles','properties','services','service_categories','service_category_mappings','bookings','sponsors','property_sponsors','sponsor_placement_impressions','analytics_events','telephony_webhook_events')) then
    raise exception using errcode='55000',message='UNEXPECTED_PUBLIC_RELATION';
  end if;
end $addon_target_guard$;

-- Lab 9 hosted idempotency: apply only after instructor/project-owner review.
-- No full phone numbers, audio, transcripts, or request bodies are stored.
create table if not exists public.telephony_webhook_events (
  event_id text primary key check (event_id ~ '^CA[0-9a-fA-F]{32}$'),
  call_status text not null,
  phone_suffix text not null check (phone_suffix ~ '^\*\*\*[0-9]{4}$'),
  processed_at timestamptz not null default now()
);

alter table public.telephony_webhook_events enable row level security;
revoke all on table public.telephony_webhook_events from anon, authenticated;
grant insert on table public.telephony_webhook_events to service_role;

-- Enforce001's insert-only service contract despite possible hosted defaults.
-- No event fixture, phone value, transcript or recording is inserted here.
revoke all on public.telephony_webhook_events from public,anon,authenticated,service_role;
grant insert on public.telephony_webhook_events to service_role;

commit;
