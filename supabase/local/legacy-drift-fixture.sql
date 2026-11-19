-- LOCAL TEST ONLY: reproduce the older permissive policy and missing tables,
-- without executing the destructive historical remote-schema export.
insert into auth.users values ('66666666-6666-4666-8666-666666666666');
create table public.profiles (
  id uuid primary key references auth.users(id),
  role text not null default 'public' check (role in ('public', 'owner', 'admin')),
  email text not null,
  created_at timestamptz default now()
);
insert into public.profiles(id, role, email) values
  ('66666666-6666-4666-8666-666666666666', 'owner', 'legacy-owner@example.test');
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id),
  title text not null,
  approved boolean default false,
  is_published boolean default true,
  created_at timestamptz default now()
);
insert into public.properties(id, owner_id, title) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa006',
  '66666666-6666-4666-8666-666666666666',
  'Preserved incomplete legacy fixture'
);
alter table public.properties enable row level security;
grant select, insert, update on public.properties to authenticated;
grant select on public.properties to anon;
create policy "Owners can update their own properties" on public.properties
  for update to authenticated using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
create policy legacy_owner_read on public.properties
  for select to authenticated using (owner_id = auth.uid());
create policy "Owners can insert their own properties" on public.properties
  for insert to authenticated with check (owner_id = auth.uid());
create policy "Public can view published properties" on public.properties
  for select to anon, authenticated using (is_published is true);
