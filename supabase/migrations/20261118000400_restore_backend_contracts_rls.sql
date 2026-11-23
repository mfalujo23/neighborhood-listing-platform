-- Forward repair only. No application rows are deleted or overwritten.
-- Do not replay the historical remote-schema export that drops service tables.
begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client',
  email text,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists email text;
alter table public.profiles alter column role set default 'client';
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_role_midterm_check;
alter table public.profiles drop constraint if exists profiles_backend_role_check;
-- Preserve known legacy role values without giving them administrator access.
alter table public.profiles add constraint profiles_backend_role_check check (
  role in ('client', 'provider', 'merchant', 'admin', 'user', 'public',
           'owner', 'property_professional', 'local_sponsor')
) not valid;

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.properties add column if not exists description text;
alter table public.properties add column if not exists street text;
alter table public.properties add column if not exists city text;
alter table public.properties add column if not exists state text;
alter table public.properties add column if not exists zip_code text;
alter table public.properties add column if not exists price numeric(12, 2);
alter table public.properties add column if not exists bedrooms integer;
alter table public.properties add column if not exists bathrooms numeric(5, 2);
alter table public.properties add column if not exists square_feet integer;
alter table public.properties add column if not exists amenities text[] not null default '{}';
alter table public.properties add column if not exists image_url text;
alter table public.properties alter column id set default gen_random_uuid();
alter table public.properties alter column approved set default false;
alter table public.properties drop constraint if exists properties_backend_contract_check;
-- NOT VALID preserves pre-existing incomplete rows. New inserts/updates must
-- satisfy the contract; validate legacy data separately before a real rollout.
alter table public.properties add constraint properties_backend_contract_check check (
  owner_id is not null and approved is not null
  and title is not null and char_length(btrim(title)) >= 1
  and street is not null and char_length(btrim(street)) >= 1
  and city is not null and char_length(btrim(city)) >= 1
  and state is not null and state ~ '^[A-Z]{2}$'
  and zip_code is not null and zip_code ~ '^[0-9]{5}(-[0-9]{4})?$'
  and price is not null and price between 0 and 9999999999.99
  and bedrooms is not null and bedrooms >= 0
  and bathrooms is not null and bathrooms >= 0
  and square_feet is not null and square_feet >= 0
) not valid;

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) >= 3),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  active_status boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(btrim(title)) >= 5),
  hourly_rate numeric(10, 2) not null check (hourly_rate >= 0),
  duration_minutes integer not null check (duration_minutes >= 15),
  coverage_radius_miles integer not null check (coverage_radius_miles > 0),
  coverage_active boolean not null default true,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'suspended')),
  created_at timestamptz not null default now()
);
alter table public.services add column if not exists coverage_active boolean not null default true;
create table if not exists public.service_category_mappings (
  service_id uuid not null references public.services(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (service_id, category_id)
);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  client_email text not null
    check (client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  requested_date date not null,
  notes text not null check (char_length(btrim(notes)) between 10 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists services_provider_id_idx on public.services(provider_id);
create index if not exists services_status_idx on public.services(status);
create index if not exists service_category_mappings_category_id_idx on public.service_category_mappings(category_id);
create index if not exists bookings_service_id_idx on public.bookings(service_id);

alter table public.services drop constraint if exists services_backend_contract_check;
alter table public.services add constraint services_backend_contract_check check (
  provider_id is not null and title is not null and char_length(btrim(title)) between 5 and 200
  and hourly_rate is not null and hourly_rate between 0 and 99999999.99
  and duration_minutes is not null and duration_minutes >= 15
  and coverage_radius_miles is not null and coverage_radius_miles > 0
  and coverage_active is not null
  and status is not null and status in ('draft', 'pending', 'approved', 'suspended')
) not valid;
alter table public.bookings drop constraint if exists bookings_backend_contract_check;
alter table public.bookings add constraint bookings_backend_contract_check check (
  service_id is not null and requested_date is not null and client_email is not null
  and client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  and notes is not null and char_length(btrim(notes)) between 10 and 2000
) not valid;

-- All policies on these owned tables are intentionally replaced: permissive
-- policies OR together, so retaining an older owner-only UPDATE/INSERT policy
-- would defeat the new approved=false and status=draft checks.
do $repair$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in
      ('profiles', 'properties', 'service_categories', 'services',
       'service_category_mappings', 'bookings')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end
$repair$;

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.service_category_mappings enable row level security;
alter table public.bookings enable row level security;

revoke all on public.profiles, public.properties, public.service_categories,
  public.services, public.service_category_mappings, public.bookings
  from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select, insert on public.profiles to authenticated;
grant select on public.properties, public.service_categories, public.services,
  public.service_category_mappings to anon, authenticated;
grant insert, update, delete on public.properties, public.services to authenticated;
grant insert, delete on public.service_category_mappings to authenticated;
grant insert on public.bookings to anon, authenticated;
grant select on public.bookings to authenticated;
grant select, insert, update, delete on public.profiles, public.properties,
  public.service_categories, public.services, public.service_category_mappings,
  public.bookings to service_role;

create policy backend_profile_read_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy backend_profile_insert_non_admin on public.profiles
  for insert to authenticated with check (
    id = (select auth.uid())
    and role in ('client', 'provider', 'merchant', 'property_professional')
  );

create policy backend_property_public_read on public.properties
  for select to anon, authenticated using (approved is true);
create policy backend_property_owner_read on public.properties
  for select to authenticated using (owner_id = (select auth.uid()));
create policy backend_property_owner_insert on public.properties
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and approved is false
  );
create policy backend_property_owner_update on public.properties
  for update to authenticated
  using (owner_id = (select auth.uid()) and approved is false)
  with check (owner_id = (select auth.uid()) and approved is false);
create policy backend_property_owner_delete on public.properties
  for delete to authenticated using (
    owner_id = (select auth.uid()) and approved is false
  );

create policy backend_category_public_read on public.service_categories
  for select to anon, authenticated using (active_status is true);
create policy backend_service_public_read on public.services
  for select to anon, authenticated using (
    status = 'approved' and coverage_active is true
  );
create policy backend_service_provider_read on public.services
  for select to authenticated using (
    provider_id = (select auth.uid()) and exists (
      select 1 from public.profiles p where p.id = (select auth.uid())
      and p.role in ('provider', 'merchant')
    )
  );
create policy backend_service_provider_insert on public.services
  for insert to authenticated with check (
    provider_id = (select auth.uid()) and status = 'draft'
    and exists (select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('provider', 'merchant'))
  );
create policy backend_service_provider_update on public.services
  for update to authenticated using (
    provider_id = (select auth.uid()) and status in ('draft', 'suspended')
    and exists (select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('provider', 'merchant'))
  ) with check (
    provider_id = (select auth.uid()) and status in ('draft', 'suspended')
  );
create policy backend_service_provider_delete on public.services
  for delete to authenticated using (
    provider_id = (select auth.uid()) and status in ('draft', 'suspended')
    and exists (select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('provider', 'merchant'))
  );
create policy backend_mapping_public_read on public.service_category_mappings
  for select to anon, authenticated using (
    exists (select 1 from public.services s where s.id = service_id
      and s.status = 'approved' and s.coverage_active is true)
    and exists (select 1 from public.service_categories c
      where c.id = category_id and c.active_status is true)
  );
create policy backend_mapping_provider_insert on public.service_category_mappings
  for insert to authenticated with check (
    exists (select 1 from public.services s where s.id = service_id
      and s.provider_id = (select auth.uid()) and s.status in ('draft', 'suspended'))
  );
create policy backend_mapping_provider_delete on public.service_category_mappings
  for delete to authenticated using (
    exists (select 1 from public.services s where s.id = service_id
      and s.provider_id = (select auth.uid()) and s.status in ('draft', 'suspended'))
  );
create policy backend_booking_public_insert on public.bookings
  for insert to anon, authenticated with check (
    exists (select 1 from public.services s where s.id = service_id
      and s.status = 'approved' and s.coverage_active is true)
  );
create policy backend_booking_provider_read on public.bookings
  for select to authenticated using (
    exists (select 1 from public.services s where s.id = service_id
      and s.provider_id = (select auth.uid()))
    and exists (select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('provider', 'merchant'))
  );

-- Administrator CRUD uses the existing service_role BYPASSRLS server context.
-- No browser role receives ownership, BYPASSRLS, TRUNCATE, or role-management grants.
commit;
