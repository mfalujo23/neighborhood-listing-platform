-- Run only after explicit authorization and visual confirmation of the new project.
-- Read-only metadata. Do not run on an existing project as a workaround.
select current_user as database_role, version() as database_version,
       to_regclass('auth.users') is not null as managed_auth_users_present,
       to_regprocedure('auth.uid()') is not null as managed_auth_uid_present;
select rolname, rolbypassrls from pg_roles
 where rolname in ('anon','authenticated','service_role') order by rolname;
select c.relname, c.relkind from pg_class c
 join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p','v','m','f') order by c.relname;
-- Required before 02: managed Auth present, all three roles present, zero public relations.
