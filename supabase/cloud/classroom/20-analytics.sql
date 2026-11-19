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
  if to_regclass('public.analytics_events') is not null
    or to_regprocedure('public.analytics_sponsor_ctr(timestamp with time zone,timestamp with time zone,uuid,text)') is not null
    or to_regprocedure('public.analytics_event_window(timestamp with time zone,timestamp with time zone,uuid,text)') is not null
    or to_regprocedure('public.purge_expired_analytics()') is not null then
    raise exception using errcode='55000',message='ADDON_TARGET_ALREADY_EXISTS_NO_OVERWRITE';
  end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p','v','m','f')
      and c.relname not in ('profiles','properties','services','service_categories','service_category_mappings','bookings','sponsors','property_sponsors','sponsor_placement_impressions','analytics_events','telephony_webhook_events')) then
    raise exception using errcode='55000',message='UNEXPECTED_PUBLIC_RELATION';
  end if;
end $addon_target_guard$;

-- Forward-only coursework telemetry model. No existing application rows changed.
create table if not exists public.analytics_events (
  event_id uuid primary key,
  event_name text not null check (event_name in ('listing_view','filter_used','sponsor_impression','sponsor_click','call_started','intent_category','tool_success','escalation','call_completed')),
  occurred_at timestamptz not null,
  property_id uuid not null references public.properties(id) on delete cascade,
  correlation_id uuid not null,
  source text not null check (source in ('fixture','provider_measured')),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  filter_key text check (filter_key in ('zip','price','bedrooms')),
  sponsor_id text check (sponsor_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'),
  neighborhood text check (neighborhood ~ '^[0-9]{5}$'),
  impression_id uuid references public.analytics_events(event_id) on delete cascade,
  intent_category text check (intent_category in ('property_details','availability','booking','sponsor_info','unknown')),
  tool_name text check (tool_name in ('get_property_details','get_nearby_sponsors','request_agent_followup')),
  tool_success boolean,
  escalation_reason text check (escalation_reason in ('webhook_timeout','fallback_transfer','human_requested','tool_failure','unknown_fact')),
  completion_outcome text check (completion_outcome in ('resolved','unresolved','abandoned')),
  pipeline_latency_ms integer check (pipeline_latency_ms between 0 and 60000),
  constraint analytics_event_minimized_shape check (
    case event_name
      when 'listing_view' then num_nonnulls(filter_key,sponsor_id,neighborhood,impression_id,intent_category,tool_name,tool_success,escalation_reason,completion_outcome,pipeline_latency_ms)=0
      when 'call_started' then num_nonnulls(filter_key,sponsor_id,neighborhood,impression_id,intent_category,tool_name,tool_success,escalation_reason,completion_outcome,pipeline_latency_ms)=0
      when 'filter_used' then filter_key is not null and num_nonnulls(filter_key,sponsor_id,neighborhood,impression_id,intent_category,tool_name,tool_success,escalation_reason,completion_outcome,pipeline_latency_ms)=1
      when 'sponsor_impression' then sponsor_id is not null and neighborhood is not null and num_nonnulls(filter_key,sponsor_id,neighborhood,impression_id,intent_category,tool_name,tool_success,escalation_reason,completion_outcome,pipeline_latency_ms)=2
      when 'sponsor_click' then impression_id is not null and num_nonnulls(filter_key,sponsor_id,neighborhood,impression_id,intent_category,tool_name,tool_success,escalation_reason,completion_outcome,pipeline_latency_ms)=1
      when 'intent_category' then intent_category is not null and num_nonnulls(filter_key,sponsor_id,neighborhood,impression_id,intent_category,tool_name,tool_success,escalation_reason,completion_outcome,pipeline_latency_ms)=1
      when 'tool_success' then tool_name is not null and tool_success is not null and num_nonnulls(filter_key,sponsor_id,neighborhood,impression_id,intent_category,tool_name,tool_success,escalation_reason,completion_outcome,pipeline_latency_ms)=2
      when 'escalation' then escalation_reason is not null and num_nonnulls(filter_key,sponsor_id,neighborhood,impression_id,intent_category,tool_name,tool_success,escalation_reason,completion_outcome,pipeline_latency_ms)=1
      when 'call_completed' then completion_outcome is not null and num_nonnulls(filter_key,sponsor_id,neighborhood,impression_id,intent_category,tool_name,tool_success,escalation_reason,completion_outcome)=1
      else false end
  )
);
alter table public.analytics_events enable row level security;
drop policy if exists analytics_scoped_read on public.analytics_events;
create policy analytics_scoped_read on public.analytics_events for select to authenticated
  using (exists (select 1 from public.profiles profile where profile.id=auth.uid()
    and (profile.role='admin' or (profile.role='property_professional' and exists (
      select 1 from public.properties p where p.id=analytics_events.property_id and p.owner_id=auth.uid())))));
revoke all on public.analytics_events from anon, authenticated;
grant select on public.analytics_events to authenticated;
grant select, insert, delete on public.analytics_events to service_role;

create or replace function public.analytics_sponsor_ctr(
  p_from timestamptz, p_end_exclusive timestamptz,
  p_property_id uuid default null, p_source text default 'provider_measured'
) returns table(neighborhood text, impression_count bigint, clicked_impressions bigint, ctr_percent numeric)
language sql stable security invoker set search_path=pg_catalog,public,pg_temp
as $$
  select i.neighborhood,
    count(distinct i.event_id) as impression_count,
    count(distinct case when c.event_id is not null then i.event_id end) as clicked_impressions,
    case when count(distinct i.event_id)>=3 then
      100.0*count(distinct case when c.event_id is not null then i.event_id end)/count(distinct i.event_id)
      else null end as ctr_percent
  from public.analytics_events i
  left join public.analytics_events c on c.impression_id=i.event_id
    and c.event_name='sponsor_click' and c.property_id=i.property_id
    and c.correlation_id=i.correlation_id and c.source=i.source
    and c.occurred_at>=p_from and c.occurred_at<p_end_exclusive
  where i.event_name='sponsor_impression' and i.source=p_source
    and i.occurred_at>=p_from and i.occurred_at<p_end_exclusive
    and (p_property_id is null or i.property_id=p_property_id)
    and p_from<p_end_exclusive
  group by i.neighborhood order by i.neighborhood;
$$;
revoke all on function public.analytics_sponsor_ctr(timestamptz,timestamptz,uuid,text) from public;
grant execute on function public.analytics_sponsor_ctr(timestamptz,timestamptz,uuid,text) to authenticated;
-- One bounded JSON result avoids a hidden PostgREST row cap and gives the
-- event window and CTR the same statement snapshot. No payload hashes returned.
create or replace function public.analytics_event_window(
  p_from timestamptz, p_end_exclusive timestamptz,
  p_property_id uuid default null, p_source text default 'provider_measured'
) returns jsonb language sql stable security invoker
set search_path=pg_catalog,public,pg_temp as $$
  with selected as (
    select event_id,event_name,occurred_at,property_id,correlation_id,source,
      filter_key,sponsor_id,neighborhood,impression_id,intent_category,
      tool_name,tool_success,escalation_reason,completion_outcome,pipeline_latency_ms
    from public.analytics_events
    where occurred_at>=p_from and occurred_at<p_end_exclusive and source=p_source
      and (p_property_id is null or property_id=p_property_id) and p_from<p_end_exclusive
    order by occurred_at,event_id limit 5001
  ) select jsonb_build_object(
    'truncated',count(*)>5000,
    'events',coalesce(jsonb_agg(to_jsonb(selected)),'[]'::jsonb),
    'sponsorCtr',coalesce((select jsonb_agg(to_jsonb(ctr)) from public.analytics_sponsor_ctr(p_from,p_end_exclusive,p_property_id,p_source) ctr),'[]'::jsonb)
  ) from selected;
$$;
revoke all on function public.analytics_event_window(timestamptz,timestamptz,uuid,text) from public;
grant execute on function public.analytics_event_window(timestamptz,timestamptz,uuid,text) to authenticated;
-- Execute this service-only procedure on an operational schedule; this migration
-- does not install a scheduler or claim any hosted deletion has run.
create or replace function public.purge_expired_analytics() returns bigint
language plpgsql security definer set search_path=pg_catalog,public,pg_temp
as $$ declare deleted_count bigint; begin
  delete from public.analytics_events where occurred_at < now()-interval '30 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end $$;
revoke all on function public.purge_expired_analytics() from public;
grant execute on function public.purge_expired_analytics() to service_role;

-- Preserve existing profile rows/constraints. Canonical provider is the
-- property-facing role; legacy property_professional remains read-only.
drop policy if exists analytics_scoped_read on public.analytics_events;
create policy analytics_scoped_read on public.analytics_events for select to authenticated
  using (exists (select 1 from public.profiles profile where profile.id=auth.uid()
    and (profile.role='admin' or (profile.role in ('provider','property_professional') and exists (
      select 1 from public.properties p where p.id=analytics_events.property_id and p.owner_id=auth.uid())))));
-- No INSERT grant/policy is added. Authenticated clients cannot write rows;
-- the server fixture adapter additionally rejects the legacy role entirely.

-- Preserve006intended grants even if hosted ALTER DEFAULT PRIVILEGES grants
-- wider access. No profile-role constraint or RLS ownership rule is widened.
revoke all on public.analytics_events from public,anon,authenticated,service_role;
grant select on public.analytics_events to authenticated;
grant select,insert,delete on public.analytics_events to service_role;
revoke all on function public.analytics_sponsor_ctr(timestamptz,timestamptz,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.analytics_sponsor_ctr(timestamptz,timestamptz,uuid,text) to authenticated;
revoke all on function public.analytics_event_window(timestamptz,timestamptz,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.analytics_event_window(timestamptz,timestamptz,uuid,text) to authenticated;
revoke all on function public.purge_expired_analytics() from public,anon,authenticated,service_role;
grant execute on function public.purge_expired_analytics() to service_role;

-- Two minimized classroom fixture views, not real user/provider measurements.
-- Independent of sponsor installation. No contacts, transcripts or latency.
do $classroom_analytics$
declare a uuid; b uuid; pa uuid; pb uuid; pid uuid; eid uuid; cid uuid;
  stamp timestamptz; canonical text;
begin
  select id into strict a from auth.users where email='cis3610-provider-a@example.test';
  select id into strict b from auth.users where email='cis3610-provider-b@example.test';
  select id into strict pa from public.properties where owner_id=a and title='Fictional approved listing';
  select id into strict pb from public.properties where owner_id=b and title='Fictional Provider B draft';
  foreach pid in array array[pa,pb] loop
    eid:=gen_random_uuid(); cid:=gen_random_uuid(); stamp:=date_trunc('milliseconds',now()-interval '1 minute');
    -- Same ordered keys/nulls/UTC-millisecond timestamp as eventToColumns and
    -- JSON.stringify. These fixed UUID/date/enum/null values contain no spaces;
    -- remove only the JSON formatter spaces, preserving every value.
    canonical:=replace(json_build_object(
      'event_id',eid,'event_name','listing_view','occurred_at',to_char(stamp at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'property_id',pid,'correlation_id',cid,'source','fixture',
      'filter_key',null,'sponsor_id',null,'neighborhood',null,'impression_id',null,
      'intent_category',null,'tool_name',null,'tool_success',null,
      'escalation_reason',null,'completion_outcome',null,'pipeline_latency_ms',null
    )::text,' ','');
    insert into public.analytics_events(event_id,event_name,occurred_at,property_id,correlation_id,source,payload_hash)
    values(eid,'listing_view',stamp,pid,cid,'fixture',encode(sha256(convert_to(canonical,'UTF8')),'hex'));
  end loop;
end
$classroom_analytics$;

commit;
