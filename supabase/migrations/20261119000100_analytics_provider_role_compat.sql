-- Preserve existing profile rows/constraints. Canonical provider is the
-- property-facing role; legacy property_professional remains read-only.
begin;
drop policy if exists analytics_scoped_read on public.analytics_events;
create policy analytics_scoped_read on public.analytics_events for select to authenticated
  using (exists (select 1 from public.profiles profile where profile.id=auth.uid()
    and (profile.role='admin' or (profile.role in ('provider','property_professional') and exists (
      select 1 from public.properties p where p.id=analytics_events.property_id and p.owner_id=auth.uid())))));
-- No INSERT grant/policy is added. Authenticated clients cannot write rows;
-- the server fixture adapter additionally rejects the legacy role entirely.
commit;
