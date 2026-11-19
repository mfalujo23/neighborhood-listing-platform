-- Forward-only coursework telemetry model. No existing application rows changed.
begin;
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
commit;
