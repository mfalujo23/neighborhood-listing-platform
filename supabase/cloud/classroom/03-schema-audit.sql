-- Catalog verification after 02. This does not impersonate a signed-in Auth user.
select c.relname, c.relrowsecurity from pg_class c
 join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' order by c.relname;
select c.relname, k.conname, k.convalidated, pg_get_constraintdef(k.oid) as definition
 from pg_constraint k join pg_class c on c.oid=k.conrelid
 join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and k.contype in ('c','f') order by c.relname,k.conname;
select tablename, policyname, roles, cmd, qual, with_check from pg_policies
 where schemaname='public' order by tablename,policyname;
select has_table_privilege('anon','public.bookings','SELECT') as anon_can_read_bookings,
       has_table_privilege('anon','public.bookings','INSERT') as anon_can_insert_bookings,
       has_table_privilege('authenticated','public.profiles','UPDATE') as browser_can_change_profile_role,
       has_table_privilege('service_role','public.services','UPDATE') as server_can_update_services;
-- Expected: six RLS-enabled tables; exact-role profiles_exam_role_check validated;
-- booking grant booleans false,true,false,true. RLS still governs permitted inserts.
