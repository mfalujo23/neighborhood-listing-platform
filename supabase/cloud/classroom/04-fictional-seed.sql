-- NEW APPROVED COURSE PROJECT ONLY. No direct Auth writes or fabricated Auth IDs.
-- First create/auto-confirm the five named fictional accounts with managed Auth.
-- Do not send invitations, verification email or SMS. Passwords stay private.
begin;
do $seed$
declare
 a uuid; b uuid; administrator uuid; client uuid; merchant uuid;
 active_category uuid := gen_random_uuid(); inactive_category uuid := gen_random_uuid();
 approved_service uuid := gen_random_uuid(); a_draft uuid := gen_random_uuid(); b_draft uuid := gen_random_uuid();
begin
 if exists(select 1 from public.profiles) or exists(select 1 from public.properties)
   or exists(select 1 from public.service_categories) or exists(select 1 from public.services)
   or exists(select 1 from public.service_category_mappings) or exists(select 1 from public.bookings) then
  raise exception using errcode='55000', message='EMPTY_COURSE_FIXTURE_REQUIRED';
 end if;
 select id into strict a from auth.users where email='cis3610-provider-a@example.test';
 select id into strict b from auth.users where email='cis3610-provider-b@example.test';
 select id into strict administrator from auth.users where email='cis3610-admin@example.test';
 select id into strict client from auth.users where email='cis3610-client@example.test';
 select id into strict merchant from auth.users where email='cis3610-merchant@example.test';
 if (select count(distinct id) from unnest(array[a,b,administrator,client,merchant]) t(id))<>5 then
  raise exception 'FIVE_DISTINCT_MANAGED_AUTH_USERS_REQUIRED';
 end if;
 insert into public.profiles(id,role,email) values
  (a,'provider','cis3610-provider-a@example.test'),(b,'provider','cis3610-provider-b@example.test'),
  (administrator,'admin','cis3610-admin@example.test'),(client,'client','cis3610-client@example.test'),
  (merchant,'merchant','cis3610-merchant@example.test');
 insert into public.service_categories(id,name,slug,active_status) values
  (active_category,'Fictional home services','fictional-home-services',true),
  (inactive_category,'Fictional archived category','fictional-archived',false);
 insert into public.services(id,provider_id,title,hourly_rate,duration_minutes,coverage_radius_miles,status) values
  (approved_service,a,'Fictional home inspection',75,60,10,'approved'),
  (a_draft,a,'Fictional Provider A draft',50,60,5,'draft'),
  (b_draft,b,'Fictional Provider B draft',60,30,5,'draft');
 insert into public.service_category_mappings(service_id,category_id) values
  (approved_service,active_category),(a_draft,active_category);
 insert into public.properties(owner_id,title,approved,street,city,state,zip_code,price,bedrooms,bathrooms,square_feet) values
  (a,'Fictional approved listing',true,'20 Example Way','Test City','CA','90032',600000,3,2,1200),
  (a,'Fictional Provider A draft',false,'10 Example Way','Test City','CA','90032',500000,2,1,900),
  (b,'Fictional Provider B draft',false,'30 Example Way','Test City','CA','90032',700000,3,2,1400);
 insert into public.bookings(service_id,client_email,requested_date,notes) values
  (approved_service,'fictional-booking@example.test',current_date+7,'Fictional seeded booking for authorization verification.');
end
$seed$;
commit;
-- Save these generated application IDs in the private test receipt. They are real
-- rows in the new fictional project, not identifiers invented as evidence.
select id,title,status,provider_id from public.services order by title;
select id,title,approved,owner_id from public.properties order by title;
