-- LOCAL TEST ONLY. Never deploy these auth stubs or role definitions to Supabase.
create role anon nologin nosuperuser nocreatedb nocreaterole;
create role authenticated nologin nosuperuser nocreatedb nocreaterole;
create role service_role nologin nosuperuser nocreatedb nocreaterole bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
