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
  if to_regclass('public.sponsors') is not null
    or to_regclass('public.property_sponsors') is not null
    or to_regclass('public.sponsor_placement_impressions') is not null
    or to_regprocedure('public.eligible_sponsors_for_property(uuid,text,text)') is not null
    or to_regprocedure('public.record_sponsor_placement_impression(text,text,text)') is not null then
    raise exception using errcode='55000',message='ADDON_TARGET_ALREADY_EXISTS_NO_OVERWRITE';
  end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v','m','f')
      and c.relname not in ('profiles','properties','services','service_categories','service_category_mappings','bookings')) then
    raise exception using errcode='55000',message='UNEXPECTED_PUBLIC_RELATION';
  end if;
end $addon_target_guard$;

-- Canonical fresh UUID prerequisites only. Existing relations are rejected by
-- the enclosing guard; no IF NOT EXISTS or legacy remote export is used here.
create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text,
  active boolean not null default false,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.property_sponsors (
  property_id uuid not null references public.properties(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  distance_miles numeric(6,2) check (distance_miles>=0),
  primary key(property_id,sponsor_id)
);
alter table public.sponsors enable row level security;
alter table public.property_sponsors enable row level security;
revoke all on public.sponsors,public.property_sponsors from anon,authenticated;
grant select,insert,update,delete on public.sponsors,public.property_sponsors to service_role;
-- Linking is a trusted server operation. Browser owners may inspect their own
-- links; the public sees only the narrow approved005RPC projection.
grant select on public.property_sponsors to authenticated;
create policy sponsor_link_owner_read on public.property_sponsors for select to authenticated
  using (exists(select 1 from public.properties p where p.id=property_id and p.owner_id=auth.uid())
    or exists(select 1 from public.sponsors s where s.id=sponsor_id and s.owner_id=auth.uid()));

-- Lab 6 forward migration: no existing campaign rows are deleted or approved.

alter table public.sponsors
  add column if not exists name text,
  add column if not exists business_name text,
  add column if not exists company_name text,
  add column if not exists approved boolean not null default false,
  add column if not exists active boolean not null default false,
  add column if not exists status text not null default 'PENDING',
  add column if not exists is_active boolean not null default false,
  add column if not exists placement text not null default 'sidebar',
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists target_zip_codes text[] not null default '{}',
  add column if not exists coverage_radius_miles numeric(6,2) not null default 0,
  add column if not exists tier text not null default 'Silver',
  add column if not exists impression_count integer not null default 0,
  add column if not exists destination_url text;
alter table public.property_sponsors add column if not exists distance_miles numeric(6,2);

-- Remove permissive OR policies, including the historical USING (true).
-- Owners can maintain pending, inactive drafts; administrators approve campaigns.
do $$ declare policy_name text; begin
  for policy_name in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'sponsors'
  loop execute format('drop policy %I on public.sponsors', policy_name); end loop;
end $$;
alter table public.sponsors enable row level security;
create policy sponsor_owner_read on public.sponsors for select to authenticated
  using (owner_id = auth.uid());
create policy sponsor_owner_draft_insert on public.sponsors for insert to authenticated
  with check (owner_id = auth.uid() and approved = false and active = false
    and status = 'PENDING' and is_active = false);
create policy sponsor_owner_draft_update on public.sponsors for update to authenticated
  using (owner_id = auth.uid() and approved = false and status = 'PENDING')
  with check (owner_id = auth.uid() and approved = false and active = false
    and status = 'PENDING' and is_active = false);
create policy sponsor_admin_manage on public.sponsors for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
revoke all on public.sponsors from anon;
grant select, insert, update on public.sponsors to authenticated;

create or replace function public.eligible_sponsors_for_property(
  p_property_id uuid, p_zip text, p_placement text default 'sidebar'
) returns table (
  id text, business_name text, destination_url text, status text,
  is_active boolean, placement text, start_date date, end_date date,
  target_zip_codes text[], coverage_radius_miles numeric, tier text,
  impression_count bigint, distance_miles numeric
) language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select s.id::text, coalesce(nullif(s.business_name, ''), nullif(s.company_name, ''), nullif(s.name, ''), 'Local partner'),
    s.destination_url, s.status, s.is_active, s.placement, s.start_date,
    s.end_date, s.target_zip_codes, s.coverage_radius_miles, s.tier,
    s.impression_count::bigint, links.distance_miles
  from public.properties p
  join lateral (
    select ps.sponsor_id, min(ps.distance_miles) as distance_miles
    from public.property_sponsors ps
    where ps.property_id = p.id and ps.distance_miles >= 0
    group by ps.sponsor_id
  ) links on true
  join public.sponsors s on s.id = links.sponsor_id
  where p.id = p_property_id and p.approved = true
    and p_zip ~ '^[0-9]{5}(-[0-9]{4})?$'
    and left(p.zip_code, 5) = left(p_zip, 5)
    and p_placement ~ '^[a-z][a-z0-9_-]{0,79}$'
    and s.status = 'APPROVED' and s.approved = true
    and s.is_active = true and s.active = true
    and s.placement = p_placement
    and CURRENT_DATE between s.start_date and s.end_date
    and s.tier in ('Platinum', 'Gold', 'Silver')
    and s.impression_count >= 0 and s.coverage_radius_miles >= 0
    and s.target_zip_codes is not null and s.destination_url is not null
    and not exists (select 1 from unnest(s.target_zip_codes) z
      where z is null or z !~ '^[0-9]{5}(-[0-9]{4})?$')
    and (exists (select 1 from unnest(s.target_zip_codes) z
      where left(z, 5) = left(p_zip, 5))
      or links.distance_miles <= s.coverage_radius_miles)
  order by case s.tier when 'Platinum' then 3 when 'Gold' then 2 else 1 end desc,
    links.distance_miles asc, s.impression_count asc, s.id::text asc;
$$;
revoke all on function public.eligible_sponsors_for_property(uuid,text,text) from public;
grant execute on function public.eligible_sponsors_for_property(uuid,text,text) to anon, authenticated;
comment on function public.eligible_sponsors_for_property(uuid,text,text) is
  'Narrow public campaign fields only; property-scoped ZIP/radius, approval and CURRENT_DATE gates. Application revalidates HTTPS destination before rendering/redirect.';

-- Text logical sponsor IDs support UUID and historical TEXT sponsor schemas.
-- This new log avoids rewriting/casting existing IDs or historical event rows.
create table if not exists public.sponsor_placement_impressions (
  id uuid primary key default gen_random_uuid(),
  sponsor_id text not null,
  placement text not null check (placement ~ '^[a-z][a-z0-9_-]{0,79}$'),
  page_context text not null check (page_context in ('home','property_detail','services')),
  created_at timestamptz not null default now()
);
alter table public.sponsor_placement_impressions enable row level security;
revoke all on public.sponsor_placement_impressions from anon, authenticated;
create or replace function public.record_sponsor_placement_impression(
  p_sponsor_id text, p_placement text, p_page_context text
) returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$ declare recorded_id text; begin
  if p_sponsor_id !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'
    or p_placement !~ '^[a-z][a-z0-9_-]{0,79}$'
    or p_page_context not in ('home','property_detail','services') then return; end if;
  update public.sponsors s set impression_count = s.impression_count + 1
  where s.id::text = p_sponsor_id and s.status = 'APPROVED' and s.approved = true
    and s.is_active = true and s.active = true and s.placement = p_placement
    and CURRENT_DATE between s.start_date and s.end_date
  returning s.id::text into recorded_id;
  if recorded_id is not null then
    insert into public.sponsor_placement_impressions(sponsor_id,placement,page_context)
      values(recorded_id,p_placement,p_page_context);
  end if;
end $$;
revoke all on function public.record_sponsor_placement_impression(text,text,text) from public;
grant execute on function public.record_sponsor_placement_impression(text,text,text) to service_role;
-- Keep existing indexes. Add no index without inspecting a realistic EXPLAIN.

-- Classroom authorization decision,2026-11-19: canonical merchant-only draft
-- writes. This is not a real stakeholder/business approval. Preserve the005
-- RPC/matching body exactly; tighten only its generic browser owner policies.
drop policy sponsor_owner_read on public.sponsors;
drop policy sponsor_owner_draft_insert on public.sponsors;
drop policy sponsor_owner_draft_update on public.sponsors;
drop policy sponsor_admin_manage on public.sponsors;
create policy sponsor_merchant_owner_read on public.sponsors for select to authenticated
  using(owner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='merchant'));
create policy sponsor_merchant_draft_insert on public.sponsors for insert to authenticated
  with check(owner_id=auth.uid() and not approved and not active and status='PENDING' and not is_active
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='merchant'));
create policy sponsor_merchant_draft_update on public.sponsors for update to authenticated
  using(owner_id=auth.uid() and not approved and status='PENDING'
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='merchant'))
  with check(owner_id=auth.uid() and not approved and not active and status='PENDING' and not is_active
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='merchant'));
-- Admin browser JWT has no special sponsor write policy. Approval is performed
-- only through the existing verified-admin/trusted service-role server path.
revoke delete on public.sponsors from authenticated;
-- Clamp hosted default privileges explicitly. The copied migration body is
-- unchanged, but a managed project's defaults may grant more than plain PG.
revoke all on public.sponsors,public.property_sponsors,public.sponsor_placement_impressions from public,anon,authenticated,service_role;
grant select,insert,update on public.sponsors to authenticated;
grant select on public.property_sponsors to authenticated;
grant select,insert,update,delete on public.sponsors,public.property_sponsors to service_role;
revoke all on function public.eligible_sponsors_for_property(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.eligible_sponsors_for_property(uuid,text,text) to anon,authenticated;
revoke all on function public.record_sponsor_placement_impression(text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.record_sponsor_placement_impression(text,text,text) to service_role;
comment on table public.sponsors is 'Classroom-only fictional campaigns; canonical UUID ownership. Database fixture eligibility is not real business/production approval.';

-- Entirely fictional classroom campaigns. No external business endorsement,
-- paid placement, real offer, outbound click or production approval is claimed.
do $classroom_sponsors$
declare mer uuid; a uuid; p uuid; sid uuid;
begin
  select id into strict mer from auth.users where email='cis3610-merchant@example.test';
  select id into strict a from auth.users where email='cis3610-provider-a@example.test';
  select id into strict p from public.properties where owner_id=a and approved and title='Fictional approved listing' and zip_code='90032';
  for sid in
    insert into public.sponsors(owner_id,name,business_name,company_name,approved,active,status,is_active,placement,start_date,end_date,target_zip_codes,coverage_radius_miles,tier,impression_count,destination_url)
    values
      (mer,'Classroom Sponsor A - fictional','Classroom Sponsor A - fictional','Classroom Sponsor A - fictional',true,true,'APPROVED',true,'sidebar',CURRENT_DATE-1,CURRENT_DATE+7,array['90032'],5,'Gold',120,'https://example.com/classroom/sponsor-a'),
      (mer,'Classroom Sponsor B - fictional','Classroom Sponsor B - fictional','Classroom Sponsor B - fictional',true,true,'APPROVED',true,'sidebar',CURRENT_DATE-1,CURRENT_DATE+7,array['90032'],5,'Gold',180,'https://example.com/classroom/sponsor-b'),
      (mer,'Classroom Sponsor C - fictional','Classroom Sponsor C - fictional','Classroom Sponsor C - fictional',true,true,'APPROVED',true,'sidebar',CURRENT_DATE-1,CURRENT_DATE+7,array['90032'],5,'Gold',20,'https://example.com/classroom/sponsor-c'),
      (mer,'Classroom Sponsor D - pending fictional','Classroom Sponsor D - pending fictional','Classroom Sponsor D - pending fictional',false,false,'PENDING',false,'sidebar',CURRENT_DATE-1,CURRENT_DATE+7,array['90032'],5,'Platinum',0,'https://example.com/classroom/sponsor-d')
    returning id
  loop
    insert into public.property_sponsors(property_id,sponsor_id,distance_miles)
      select p,sid,case when name like 'Classroom Sponsor A %' then 1 when name like 'Classroom Sponsor D %' then 0.1 else 0.4 end
      from public.sponsors where id=sid;
  end loop;
end
$classroom_sponsors$;

commit;
