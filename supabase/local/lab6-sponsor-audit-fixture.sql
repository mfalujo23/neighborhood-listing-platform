-- Local disposable database only. All names/URLs/UUIDs are fictional fixtures.
-- Teacher supplied only A/B/C/D tier, miles, impressions and status.
-- Chosen fixture details: property UUID, ZIP 90032, radius 5, sidebar,
-- example.com destinations, CURRENT_DATE +/- 1 day (active dates).
begin;
do $$ begin
  if not exists (select 1 from public.properties
      where id = '60000000-0000-4000-8000-000000000001' and approved and zip_code = '90032') then
    raise exception 'Local fixture requires approved fictional property 60000000-0000-4000-8000-000000000001 ZIP 90032; seed through backend harness.';
  end if;
end $$;
insert into public.sponsors
  (id, name, business_name, company_name, approved, active, status, is_active, placement,
   start_date, end_date, target_zip_codes, coverage_radius_miles, tier,
   impression_count, destination_url)
values
 ('60000000-0000-4000-8000-00000000000a','Sponsor A','Sponsor A','Sponsor A',true,true,'APPROVED',true,'sidebar',CURRENT_DATE-1,CURRENT_DATE+1,array['90032'],5,'Silver',120,'https://example.com/sponsor-a'),
 ('60000000-0000-4000-8000-00000000000b','Sponsor B','Sponsor B','Sponsor B',true,true,'APPROVED',true,'sidebar',CURRENT_DATE-1,CURRENT_DATE+1,array['90032'],5,'Gold',45,'https://example.com/sponsor-b'),
 ('60000000-0000-4000-8000-00000000000c','Sponsor C','Sponsor C','Sponsor C',true,true,'APPROVED',true,'sidebar',CURRENT_DATE-1,CURRENT_DATE+1,array['90032'],5,'Gold',90,'https://example.com/sponsor-c'),
 ('60000000-0000-4000-8000-00000000000d','Sponsor D','Sponsor D','Sponsor D',false,true,'PENDING',true,'sidebar',CURRENT_DATE-1,CURRENT_DATE+1,array['90032'],5,'Platinum',10,'https://example.com/sponsor-d');
insert into public.property_sponsors (property_id,sponsor_id,distance_miles) values
 ('60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-00000000000a',0.4),
 ('60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-00000000000b',1.2),
 ('60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-00000000000c',0.8),
 ('60000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-00000000000d',0.2);
set local role anon;
select id, business_name, tier, distance_miles, impression_count
from public.eligible_sponsors_for_property('60000000-0000-4000-8000-000000000001','90032','sidebar');
explain (analyze, buffers, format text)
select * from public.eligible_sponsors_for_property('60000000-0000-4000-8000-000000000001','90032','sidebar');
rollback;
