-- Preserve existing profile rows; enforce the exact examination role set on
-- every new or updated profile. No legacy role is silently rewritten.
begin;
alter table public.profiles drop constraint if exists profiles_exam_role_check;
alter table public.profiles add constraint profiles_exam_role_check
  check (role in ('admin', 'merchant', 'provider', 'client')) not valid;
drop policy if exists backend_profile_insert_non_admin on public.profiles;
create policy backend_profile_insert_non_admin on public.profiles
  for insert to authenticated with check (
    id = (select auth.uid()) and role in ('client', 'provider', 'merchant')
  );
commit;
