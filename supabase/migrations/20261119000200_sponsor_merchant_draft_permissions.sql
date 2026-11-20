-- Preserve campaigns and RPC bodies; reconcile browser draft access with the
-- protected canonical merchant role. Apply only after reviewed 005 prerequisites.
begin;

do $sponsor_permission_guard$
begin
  if to_regclass('public.sponsors') is null
    or to_regclass('public.property_sponsors') is null
    or to_regclass('public.sponsor_placement_impressions') is null
    or to_regclass('public.profiles') is null
    or to_regprocedure('public.eligible_sponsors_for_property(uuid,text,text)') is null
    or to_regprocedure('public.record_sponsor_placement_impression(text,text,text)') is null then
    raise exception using errcode='55000', message='REVIEWED_SPONSOR_PREREQUISITES_REQUIRED';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='sponsors'
    and policyname not in ('sponsor_owner_read','sponsor_owner_draft_insert',
      'sponsor_owner_draft_update','sponsor_admin_manage','sponsor_merchant_owner_read',
      'sponsor_merchant_draft_insert','sponsor_merchant_draft_update')) then
    raise exception using errcode='55000', message='UNREVIEWED_SPONSOR_POLICY';
  end if;
  if exists(select 1 from pg_policies where schemaname='public' and tablename='property_sponsors'
    and policyname<>'sponsor_link_owner_read')
    or exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in ('property_sponsors','sponsor_placement_impressions','profiles')
        and not c.relrowsecurity) then
    raise exception using errcode='55000', message='REVIEWED_LINK_AND_PROFILE_RLS_REQUIRED';
  end if;
end
$sponsor_permission_guard$;

drop policy if exists sponsor_owner_read on public.sponsors;
drop policy if exists sponsor_owner_draft_insert on public.sponsors;
drop policy if exists sponsor_owner_draft_update on public.sponsors;
drop policy if exists sponsor_admin_manage on public.sponsors;
drop policy if exists sponsor_merchant_owner_read on public.sponsors;
drop policy if exists sponsor_merchant_draft_insert on public.sponsors;
drop policy if exists sponsor_merchant_draft_update on public.sponsors;
alter table public.sponsors enable row level security;
create policy sponsor_merchant_owner_read on public.sponsors for select to authenticated
  using (owner_id=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='merchant'));
create policy sponsor_merchant_draft_insert on public.sponsors for insert to authenticated
  with check (owner_id=auth.uid() and not approved and not active and status='PENDING' and not is_active
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='merchant'));
create policy sponsor_merchant_draft_update on public.sponsors for update to authenticated
  using (owner_id=auth.uid() and not approved and status='PENDING'
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='merchant'))
  with check (owner_id=auth.uid() and not approved and not active and status='PENDING' and not is_active
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='merchant'));

-- Browser administrators receive no special approval or bypass policy.
revoke all on public.sponsors,public.property_sponsors,public.sponsor_placement_impressions
  from public,anon,authenticated,service_role;
grant select,insert,update on public.sponsors to authenticated;
grant select on public.property_sponsors to authenticated;
grant select,insert,update,delete on public.sponsors,public.property_sponsors to service_role;
revoke all on function public.eligible_sponsors_for_property(uuid,text,text)
  from public,anon,authenticated,service_role;
grant execute on function public.eligible_sponsors_for_property(uuid,text,text) to anon,authenticated;
revoke all on function public.record_sponsor_placement_impression(text,text,text)
  from public,anon,authenticated,service_role;
grant execute on function public.record_sponsor_placement_impression(text,text,text) to service_role;

commit;
