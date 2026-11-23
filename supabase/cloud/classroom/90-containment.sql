-- OPTIONAL CONTAINMENT, not a destructive rollback. Confirm the new project
-- visually and disable related application feature flags first. Retain data.
-- This file never drops relations, rewrites core data or changes Auth accounts.
begin;
do $contain_optional_access$
begin
  if to_regprocedure('public.eligible_sponsors_for_property(uuid,text,text)') is not null then
    revoke execute on function public.eligible_sponsors_for_property(uuid,text,text) from public,anon,authenticated;
  end if;
  if to_regprocedure('public.record_sponsor_placement_impression(text,text,text)') is not null then
    revoke execute on function public.record_sponsor_placement_impression(text,text,text) from public,anon,authenticated,service_role;
  end if;
  if to_regclass('public.analytics_events') is not null then
    revoke all on public.analytics_events from public,anon,authenticated;
  end if;
  if to_regprocedure('public.analytics_event_window(timestamptz,timestamptz,uuid,text)') is not null then
    revoke execute on function public.analytics_event_window(timestamptz,timestamptz,uuid,text) from public,anon,authenticated;
  end if;
  if to_regprocedure('public.analytics_sponsor_ctr(timestamptz,timestamptz,uuid,text)') is not null then
    revoke execute on function public.analytics_sponsor_ctr(timestamptz,timestamptz,uuid,text) from public,anon,authenticated;
  end if;
  if to_regclass('public.telephony_webhook_events') is not null then
    revoke insert on public.telephony_webhook_events from public,anon,authenticated,service_role;
  end if;
end
$contain_optional_access$;
commit;
-- Re-enable only through a separately reviewed forward grants/policy change.
-- Do not rerun raw005: it would replace the merchant-only policy tightening.
