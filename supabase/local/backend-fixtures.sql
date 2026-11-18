-- Entirely fictional local identities and records. No Supabase auth accounts.
insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333'),
  ('44444444-4444-4444-8444-444444444444'),
  ('55555555-5555-4555-8555-555555555555'),
  ('77777777-7777-4777-8777-777777777777');
insert into public.profiles(id, role, email) values
  ('11111111-1111-4111-8111-111111111111', 'provider', 'provider-a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'provider', 'provider-b@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'admin', 'admin@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'client', 'client@example.test'),
  ('55555555-5555-4555-8555-555555555555', 'merchant', 'merchant@example.test');
insert into public.properties
  (id, owner_id, title, approved, street, city, state, zip_code, price,
   bedrooms, bathrooms, square_feet) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001', '11111111-1111-4111-8111-111111111111',
   'Fictional private listing A', false, '10 Example Way', 'Test City', 'CA', '90032', 500000, 2, 1, 900),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002', '11111111-1111-4111-8111-111111111111',
   'Fictional approved listing A', true, '20 Example Way', 'Test City', 'CA', '90032', 600000, 3, 2, 1200),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa003', '22222222-2222-4222-8222-222222222222',
   'Fictional private listing B', false, '30 Example Way', 'Test City', 'CA', '90032', 700000, 3, 2, 1400);
insert into public.service_categories(id, name, slug, active_status) values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', 'Home inspection', 'inspection', true),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'Inactive category', 'inactive', false);
insert into public.services
  (id, provider_id, title, hourly_rate, duration_minutes, coverage_radius_miles,
   status, coverage_active) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '11111111-1111-4111-8111-111111111111',
   'Provider A draft', 50, 60, 10, 'draft', true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111111',
   'Provider A approved', 75, 60, 10, 'approved', true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '22222222-2222-4222-8222-222222222222',
   'Provider B draft', 60, 30, 5, 'draft', true),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', '11111111-1111-4111-8111-111111111111',
   'Inactive approved coverage', 90, 60, 10, 'approved', false),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5', '22222222-2222-4222-8222-222222222222',
   'Provider B approved', 80, 45, 5, 'approved', true);
insert into public.service_category_mappings(service_id, category_id) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2');
insert into public.bookings(id, service_id, client_email, requested_date, notes) values
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
   'client-a@example.test', '2027-01-01', 'Fictional appointment request A'),
  ('dddddddd-dddd-4ddd-8ddd-ddddddddddd2', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
   'client-b@example.test', '2027-01-02', 'Fictional appointment request B');
