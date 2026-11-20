-- SINGLE READ-ONLY RESULT GRID. New emzgyjdasctljwnbcuov only.
-- No keys, user IDs, contacts or row data are returned.
with functions as (
  select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
    p.prosecdef,p.proconfig,
    has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') as browser_execute,
    has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'eligible_sponsors_for_property','record_sponsor_placement_impression',
    'analytics_sponsor_ctr','analytics_event_window','purge_expired_analytics')
)
select *,case
  when proname='eligible_sponsors_for_property' then prosecdef and anon_execute and browser_execute and not service_execute
  when proname='record_sponsor_placement_impression' then prosecdef and not anon_execute and not browser_execute and service_execute
  when proname in ('analytics_sponsor_ctr','analytics_event_window') then not prosecdef and not anon_execute and browser_execute and not service_execute
  when proname='purge_expired_analytics' then prosecdef and not anon_execute and not browser_execute and service_execute
  else false end as expected_function_grants
from functions order by proname;
-- Expected exactly five rows; expected_function_grants=true on every row.
