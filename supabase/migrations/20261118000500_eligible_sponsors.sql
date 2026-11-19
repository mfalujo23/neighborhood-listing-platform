-- Lab 6 forward migration: no existing campaign rows are deleted or approved.
begin;

alter table public.sponsors
  add column if not exists name text,
  add column if not exists business_name text,
  add column if not exists company_name text,
  add column if not exists approved boolean not null default false,
  add column if not exists active boolean not null default false,
  add column if not exists status text not null default 'PENDING',
  add column if not exists is_active boolean not null default false,
  add column if not exists placement text not null default 'sidebar',
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists target_zip_codes text[] not null default '{}',
  add column if not exists coverage_radius_miles numeric(6,2) not null default 0,
  add column if not exists tier text not null default 'Silver',
  add column if not exists impression_count integer not null default 0,
  add column if not exists destination_url text;
alter table public.property_sponsors add column if not exists distance_miles numeric(6,2);

-- Remove permissive OR policies, including the historical USING (true).
-- Owners can maintain pending, inactive drafts; administrators approve campaigns.
do $$ declare policy_name text; begin
  for policy_name in select policyname from pg_policies
    where schemaname = 'public' and tablename = 'sponsors'
  loop execute format('drop policy %I on public.sponsors', policy_name); end loop;
end $$;
alter table public.sponsors enable row level security;
create policy sponsor_owner_read on public.sponsors for select to authenticated
  using (owner_id = auth.uid());
create policy sponsor_owner_draft_insert on public.sponsors for insert to authenticated
  with check (owner_id = auth.uid() and approved = false and active = false
    and status = 'PENDING' and is_active = false);
create policy sponsor_owner_draft_update on public.sponsors for update to authenticated
  using (owner_id = auth.uid() and approved = false and status = 'PENDING')
  with check (owner_id = auth.uid() and approved = false and active = false
    and status = 'PENDING' and is_active = false);
create policy sponsor_admin_manage on public.sponsors for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
revoke all on public.sponsors from anon;
grant select, insert, update on public.sponsors to authenticated;

create or replace function public.eligible_sponsors_for_property(
  p_property_id uuid, p_zip text, p_placement text default 'sidebar'
) returns table (
  id text, business_name text, destination_url text, status text,
  is_active boolean, placement text, start_date date, end_date date,
  target_zip_codes text[], coverage_radius_miles numeric, tier text,
  impression_count bigint, distance_miles numeric
) language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select s.id::text, coalesce(nullif(s.business_name, ''), nullif(s.company_name, ''), nullif(s.name, ''), 'Local partner'),
    s.destination_url, s.status, s.is_active, s.placement, s.start_date,
    s.end_date, s.target_zip_codes, s.coverage_radius_miles, s.tier,
    s.impression_count::bigint, links.distance_miles
  from public.properties p
  join lateral (
    select ps.sponsor_id, min(ps.distance_miles) as distance_miles
    from public.property_sponsors ps
    where ps.property_id = p.id and ps.distance_miles >= 0
    group by ps.sponsor_id
  ) links on true
  join public.sponsors s on s.id = links.sponsor_id
  where p.id = p_property_id and p.approved = true
    and p_zip ~ '^[0-9]{5}(-[0-9]{4})?$'
    and left(p.zip_code, 5) = left(p_zip, 5)
    and p_placement ~ '^[a-z][a-z0-9_-]{0,79}$'
    and s.status = 'APPROVED' and s.approved = true
    and s.is_active = true and s.active = true
    and s.placement = p_placement
    and CURRENT_DATE between s.start_date and s.end_date
    and s.tier in ('Platinum', 'Gold', 'Silver')
    and s.impression_count >= 0 and s.coverage_radius_miles >= 0
    and s.target_zip_codes is not null and s.destination_url is not null
    and not exists (select 1 from unnest(s.target_zip_codes) z
      where z is null or z !~ '^[0-9]{5}(-[0-9]{4})?$')
    and (exists (select 1 from unnest(s.target_zip_codes) z
      where left(z, 5) = left(p_zip, 5))
      or links.distance_miles <= s.coverage_radius_miles)
  order by case s.tier when 'Platinum' then 3 when 'Gold' then 2 else 1 end desc,
    links.distance_miles asc, s.impression_count asc, s.id::text asc;
$$;
revoke all on function public.eligible_sponsors_for_property(uuid,text,text) from public;
grant execute on function public.eligible_sponsors_for_property(uuid,text,text) to anon, authenticated;
comment on function public.eligible_sponsors_for_property(uuid,text,text) is
  'Narrow public campaign fields only; property-scoped ZIP/radius, approval and CURRENT_DATE gates. Application revalidates HTTPS destination before rendering/redirect.';

-- Text logical sponsor IDs support UUID and historical TEXT sponsor schemas.
-- This new log avoids rewriting/casting existing IDs or historical event rows.
create table if not exists public.sponsor_placement_impressions (
  id uuid primary key default gen_random_uuid(),
  sponsor_id text not null,
  placement text not null check (placement ~ '^[a-z][a-z0-9_-]{0,79}$'),
  page_context text not null check (page_context in ('home','property_detail','services')),
  created_at timestamptz not null default now()
);
alter table public.sponsor_placement_impressions enable row level security;
revoke all on public.sponsor_placement_impressions from anon, authenticated;
create or replace function public.record_sponsor_placement_impression(
  p_sponsor_id text, p_placement text, p_page_context text
) returns void language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$ declare recorded_id text; begin
  if p_sponsor_id !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$'
    or p_placement !~ '^[a-z][a-z0-9_-]{0,79}$'
    or p_page_context not in ('home','property_detail','services') then return; end if;
  update public.sponsors s set impression_count = s.impression_count + 1
  where s.id::text = p_sponsor_id and s.status = 'APPROVED' and s.approved = true
    and s.is_active = true and s.active = true and s.placement = p_placement
    and CURRENT_DATE between s.start_date and s.end_date
  returning s.id::text into recorded_id;
  if recorded_id is not null then
    insert into public.sponsor_placement_impressions(sponsor_id,placement,page_context)
      values(recorded_id,p_placement,p_page_context);
  end if;
end $$;
revoke all on function public.record_sponsor_placement_impression(text,text,text) from public;
grant execute on function public.record_sponsor_placement_impression(text,text,text) to service_role;
-- Keep existing indexes. Add no index without inspecting a realistic EXPLAIN.
commit;
