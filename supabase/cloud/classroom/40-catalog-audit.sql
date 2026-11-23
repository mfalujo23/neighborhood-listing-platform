-- Read-only; run only in the confirmed new project after selected add-ons.
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' order by c.relname;
select table_name,column_name,data_type,is_nullable from information_schema.columns
 where table_schema='public' and table_name in ('sponsors','property_sponsors','sponsor_placement_impressions','analytics_events','telephony_webhook_events')
 order by table_name,ordinal_position;
select c.relname,k.conname,k.convalidated,pg_get_constraintdef(k.oid) as definition
 from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('sponsors','property_sponsors','analytics_events','telephony_webhook_events')
 order by c.relname,k.conname;
select tablename,policyname,roles,cmd,qual,with_check from pg_policies
 where schemaname='public' and tablename in ('sponsors','property_sponsors','sponsor_placement_impressions','analytics_events','telephony_webhook_events')
 order by tablename,policyname;
select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as browser_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') as service_execute
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
 and p.proname in ('eligible_sponsors_for_property','record_sponsor_placement_impression','analytics_sponsor_ctr','analytics_event_window','purge_expired_analytics')
 order by p.proname;
select c.relname,has_table_privilege('anon',c.oid,'SELECT') as anon_select,
 has_table_privilege('authenticated',c.oid,'INSERT') as browser_insert,
 has_table_privilege('authenticated',c.oid,'UPDATE') as browser_update,
 has_table_privilege('service_role',c.oid,'SELECT') as server_select,
 has_table_privilege('service_role',c.oid,'INSERT') as server_insert,
 has_table_privilege('service_role',c.oid,'UPDATE') as server_update
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
 and c.relname in ('sponsors','property_sponsors','sponsor_placement_impressions','analytics_events','telephony_webhook_events')
 order by c.relname;
-- Exact actual UUIDs, fixture values and RPC rows should be inspected privately
-- in the coordinator's scoped test. This catalog file returns no contacts.
