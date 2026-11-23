-- FRESH ISOLATED COURSE PROJECT ONLY. No application rows are inserted.
-- Existing application tables cause a guarded rollback. Do not run the
-- historical remote-schema export. No local auth stub is included here.
begin;

do $empty_public_guard$
begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind in ('r','p','v','m','f')) then
  raise exception using errcode='55000', message='EMPTY_PUBLIC_SCHEMA_REQUIRED';
 end if;
end
$empty_public_guard$;

do $fresh_project_guard$
begin
 if exists(select 1 from pg_tables where schemaname='public' and tablename in
 ('profiles','properties','service_categories','services','service_category_mappings','bookings')) then
  raise exception using errcode='55000', message='FRESH_MIDTERM_PROJECT_REQUIRED';
 end if;
end
$fresh_project_guard$;

-- Source: supabase/migrations/20261029140000_exam_services_persistence.sql
-- SHA256: ebf3d013e8312cbe1d53dfbfd9037ed4ba028cc45684a62a4c68c980088631a1
-- Midterm services, categories, mappings, and bookings.
-- Fresh-project profile contract. Existing rows are retained. Existing deployments
-- use the forward repair migrations rather than replaying this migration.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client'
    check (role in ('admin', 'merchant', 'provider', 'client')),
  email text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) >= 3),
  slug text not null unique check (slug ~* '^[a-z0-9-]+$'),
  active_status boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) >= 5),
  hourly_rate numeric(10, 2) not null check (hourly_rate >= 0),
  duration_minutes integer not null check (duration_minutes >= 15),
  coverage_radius_miles integer not null check (coverage_radius_miles > 0),
  coverage_active boolean not null default true,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'suspended')),
  created_at timestamptz not null default now()
);

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
  notes text not null check (char_length(notes) between 10 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists services_provider_id_idx
  on public.services(provider_id);
create index if not exists services_status_idx
  on public.services(status);
create index if not exists service_category_mappings_category_id_idx
  on public.service_category_mappings(category_id);
create index if not exists bookings_service_id_idx
  on public.bookings(service_id);
create index if not exists bookings_requested_date_idx
  on public.bookings(requested_date);

alter table public.profiles enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.service_category_mappings enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "Users can create a basic own profile" on public.profiles;
create policy "Users can create a basic own profile"
  on public.profiles for insert to authenticated
  with check (
    id = (select auth.uid())
    and role in ('client', 'provider', 'merchant')
  );

drop policy if exists "Clients can create their own profile" on public.profiles;
create policy "Clients can create their own profile"
  on public.profiles for insert to authenticated
  with check (
    id = (select auth.uid())
    and role = 'client'
  );

drop policy if exists "Public can read active service categories"
  on public.service_categories;
create policy "Public can read active service categories"
  on public.service_categories for select to anon, authenticated
  using (active_status = true);

drop policy if exists "Public can read approved services" on public.services;
create policy "Public can read approved services"
  on public.services for select to anon, authenticated
  using (status = 'approved' and coverage_active is true);

drop policy if exists "Providers can read their own services" on public.services;
create policy "Providers can read their own services"
  on public.services for select to authenticated
  using (
    provider_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('provider', 'merchant')
    )
  );

drop policy if exists "Providers can create draft services" on public.services;
create policy "Providers can create draft services"
  on public.services for insert to authenticated
  with check (
    provider_id = (select auth.uid())
    and status = 'draft'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('provider', 'merchant')
    )
  );

drop policy if exists "Providers can update their draft or suspended services"
  on public.services;
create policy "Providers can update their draft or suspended services"
  on public.services for update to authenticated
  using (
    provider_id = (select auth.uid())
    and status in ('draft', 'suspended')
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('provider', 'merchant')
    )
  )
  with check (
    provider_id = (select auth.uid())
    and status in ('draft', 'suspended')
  );

drop policy if exists "Providers can delete their draft services"
  on public.services;
create policy "Providers can delete their draft services"
  on public.services for delete to authenticated
  using (
    provider_id = (select auth.uid())
    and status in ('draft', 'suspended')
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('provider', 'merchant')
    )
  );

drop policy if exists "Public can read visible service category mappings"
  on public.service_category_mappings;
create policy "Public can read visible service category mappings"
  on public.service_category_mappings for select to anon, authenticated
  using (
    exists (
      select 1 from public.services s
      where s.id = service_id and s.status = 'approved' and s.coverage_active is true
    )
    and exists (
      select 1 from public.service_categories c
      where c.id = category_id and c.active_status = true
    )
  );

drop policy if exists "Providers can add categories to their draft services"
  on public.service_category_mappings;
create policy "Providers can add categories to their draft services"
  on public.service_category_mappings for insert to authenticated
  with check (
    exists (
      select 1 from public.services s
      join public.profiles p on p.id = s.provider_id
      where s.id = service_id
        and s.provider_id = (select auth.uid())
        and s.status in ('draft', 'suspended')
        and p.role in ('provider', 'merchant')
    )
  );

drop policy if exists "Providers can remove categories from their draft services"
  on public.service_category_mappings;
create policy "Providers can remove categories from their draft services"
  on public.service_category_mappings for delete to authenticated
  using (
    exists (
      select 1 from public.services s
      join public.profiles p on p.id = s.provider_id
      where s.id = service_id
        and s.provider_id = (select auth.uid())
        and s.status in ('draft', 'suspended')
        and p.role in ('provider', 'merchant')
    )
  );

drop policy if exists "Visitors can submit bookings for approved services"
  on public.bookings;
create policy "Visitors can submit bookings for approved services"
  on public.bookings for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.services s
      where s.id = service_id and s.status = 'approved' and s.coverage_active is true
    )
  );

drop policy if exists "Providers can read bookings for their services"
  on public.bookings;
create policy "Providers can read bookings for their services"
  on public.bookings for select to authenticated
  using (
    exists (
      select 1 from public.services s
      join public.profiles p on p.id = s.provider_id
      where s.id = service_id
        and s.provider_id = (select auth.uid())
        and p.role in ('provider', 'merchant')
    )
  );

grant usage on schema public to anon, authenticated, service_role;

revoke all on public.service_categories,
  public.services,
  public.service_category_mappings,
  public.bookings
from anon, authenticated;

grant select on public.service_categories, public.services,
  public.service_category_mappings to anon, authenticated;

grant select, insert on public.profiles to authenticated;
grant insert, update, delete on public.services to authenticated;
grant insert, delete on public.service_category_mappings to authenticated;
grant insert on public.bookings to anon, authenticated;
grant select on public.bookings to authenticated;

grant select, insert, update, delete on public.profiles, public.service_categories,
  public.services,
  public.service_category_mappings,
  public.bookings to service_role;

-- Source: supabase/migrations/20261118000400_restore_backend_contracts_rls.sql
-- SHA256: 4629aa9c6534259112dfcb0d70bac77b77fc3947c20691dc5db568caeb66e2b6
-- Forward repair only. No application rows are deleted or overwritten.
-- Do not replay the historical remote-schema export that drops service tables.

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

-- Source: supabase/migrations/20261118000700_midterm_profile_roles.sql
-- SHA256: a1057235e63ed72ea58f228fe2bab3cf2858f0960d9622a6b04853dd85f5465d
-- Preserve existing profile rows; enforce the exact examination role set on
-- every new or updated profile. No legacy role is silently rewritten.

alter table public.profiles drop constraint if exists profiles_exam_role_check;
alter table public.profiles add constraint profiles_exam_role_check
  check (role in ('admin', 'merchant', 'provider', 'client')) not valid;
drop policy if exists backend_profile_insert_non_admin on public.profiles;
create policy backend_profile_insert_non_admin on public.profiles
  for insert to authenticated with check (
    id = (select auth.uid()) and role in ('client', 'provider', 'merchant')
  );

alter table public.profiles validate constraint profiles_backend_role_check;
alter table public.profiles validate constraint profiles_exam_role_check;
alter table public.properties validate constraint properties_backend_contract_check;
alter table public.services validate constraint services_backend_contract_check;
alter table public.bookings validate constraint bookings_backend_contract_check;
commit;
