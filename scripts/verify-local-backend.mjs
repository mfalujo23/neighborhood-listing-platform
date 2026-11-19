import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const migrationPath = 'supabase/migrations/20261118000400_restore_backend_contracts_rls.sql';
const migration = await readFile(migrationPath, 'utf8');
const bootstrap = await readFile('supabase/local/auth-bootstrap.sql', 'utf8');
const legacy = await readFile('supabase/local/legacy-drift-fixture.sql', 'utf8');
const fixtures = await readFile('supabase/local/backend-fixtures.sql', 'utf8');
const uid = {
  owner: '11111111-1111-4111-8111-111111111111',
  other: '22222222-2222-4222-8222-222222222222',
  admin: '33333333-3333-4333-8333-333333333333',
  client: '44444444-4444-4444-8444-444444444444',
  merchant: '55555555-5555-4555-8555-555555555555',
  legacy: '66666666-6666-4666-8666-666666666666',
  newClient: '77777777-7777-4777-8777-777777777777',
};
const privateId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa001';
const approvedId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaa002';
const draftService = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
const approvedService = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
const otherDraft = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3';
const inactiveService = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4';
const db = await PGlite.create();
const results = [];
const cleanDb = await PGlite.create();
let cleanSchemaTables;
try {
  await cleanDb.exec(bootstrap);
  await cleanDb.exec(migration);
  cleanSchemaTables = (await cleanDb.query(`select tablename from pg_tables
    where schemaname = 'public' order by tablename`)).rows.map((r) => r.tablename);
  assert.deepEqual(cleanSchemaTables, ['bookings', 'profiles', 'properties', 'service_categories', 'service_category_mappings', 'services']);
  console.log('Clean empty-database migration: PASS', JSON.stringify(cleanSchemaTables));
} finally {
  await cleanDb.close();
}

async function check(name, role, userId, sql, params, expected) {
  assert.ok(['anon', 'authenticated', 'service_role'].includes(role));
  await db.exec(`begin; set local role ${role};`);
  await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? '']);
  let actual;
  try {
    const response = await db.query(sql, params);
    actual = { rows: response.rows, affectedRows: response.affectedRows ?? 0 };
  } catch (error) {
    actual = { error: { code: error.code, message: error.message } };
  } finally {
    await db.exec('rollback');
  }
  const record = { name, role, localAuthUid: userId ?? null, sql, params, actual, expected };
  results.push(record);
  if (expected.code) assert.equal(actual.error?.code, expected.code, name);
  else {
    assert.equal(actual.error, undefined, `${name}: ${actual.error?.message}`);
    if ('rows' in expected) assert.equal(actual.rows.length, expected.rows, name);
    if ('affectedRows' in expected) assert.equal(actual.affectedRows, expected.affectedRows, name);
  }
  console.log(`${name}: PASS ${JSON.stringify(actual)}`);
}

try {
  const version = (await db.query('select version()')).rows[0].version;
  await db.exec(bootstrap);
  await db.exec(legacy);
  await check('Legacy published flag actually exposed unapproved row (read only)', 'anon', null,
    'select id from public.properties where approved is false', [], { rows: 1 });
  await check('Legacy owner insert actually allowed pre-approved row (rolled back)', 'authenticated', uid.legacy,
    'insert into public.properties(owner_id, title, approved) values ($1, $2, true) returning id',
    [uid.legacy, 'Fictional pre-approved legacy insert'], { affectedRows: 1 });
  await check('Legacy policy actually allowed self-approval (rolled back)', 'authenticated', uid.legacy,
    'update public.properties set approved = true returning id', [], { affectedRows: 1 });
  const legacyBefore = (await db.query('select id, title, approved from public.properties')).rows;
  await db.exec(migration);
  assert.deepEqual((await db.query('select id, title, approved from public.properties')).rows, legacyBefore,
    'Forward migration must preserve existing rows');
  await db.exec(migration);
  assert.deepEqual((await db.query('select id, title, approved from public.properties')).rows, legacyBefore,
    'Reapplying the migration must not alter existing rows');
  await db.exec(fixtures);

  await check('Anonymous sees only approved property', 'anon', null,
    'select id, title, approved from public.properties order by id', [], { rows: 1 });
  await check('Anonymous private-property query returns []', 'anon', null,
    'select id from public.properties where id = $1', [privateId], { rows: 0 });
  await check('Anonymous property insert denied', 'anon', null,
    'insert into public.properties(owner_id, title) values ($1, $2)', [uid.owner, 'Forbidden insert'], { code: '42501' });
  await check('Owner can read private property', 'authenticated', uid.owner,
    'select id from public.properties where id = $1', [privateId], { rows: 1 });
  await check('Owner can edit own unapproved property', 'authenticated', uid.owner,
    'update public.properties set title = $1 where id = $2 returning id', ['Revised fictional title', privateId], { affectedRows: 1 });
  await check('Owner cannot self-approve', 'authenticated', uid.owner,
    'update public.properties set approved = true where id = $1 returning id', [privateId], { code: '42501' });
  await check('Owner cannot edit already approved property', 'authenticated', uid.owner,
    'update public.properties set title = $1 where id = $2 returning id', ['Unauthorized live edit', approvedId], { affectedRows: 0 });
  await check('Owner can delete own unapproved property', 'authenticated', uid.owner,
    'delete from public.properties where id = $1 returning id', [privateId], { affectedRows: 1 });
  await check('Other authenticated user sees no private property', 'authenticated', uid.other,
    'select id from public.properties where id = $1', [privateId], { rows: 0 });
  await check('Other authenticated user can read approved public property', 'authenticated', uid.other,
    'select id from public.properties where id = $1', [approvedId], { rows: 1 });
  await check('Other authenticated update affects zero rows', 'authenticated', uid.other,
    'update public.properties set title = $1 where id = $2 returning id', ['Forbidden other edit', privateId], { affectedRows: 0 });
  await check('Other authenticated delete affects zero rows', 'authenticated', uid.other,
    'delete from public.properties where id = $1 returning id', [privateId], { affectedRows: 0 });
  const propertyInsert = `insert into public.properties
    (owner_id, title, approved, street, city, state, zip_code, price, bedrooms, bathrooms, square_feet)
    values ($1, 'Fictional inserted listing', $2, '40 Example Way', 'Test City', 'CA', '90032', $3, 2, 1, 800)
    returning id`;
  await check('Owner can insert an unapproved property', 'authenticated', uid.owner,
    propertyInsert, [uid.owner, false, 500000], { affectedRows: 1 });
  await check('Owner cannot insert an already approved property', 'authenticated', uid.owner,
    propertyInsert, [uid.owner, true, 500000], { code: '42501' });
  await check('Other cannot forge owner on property insert', 'authenticated', uid.other,
    propertyInsert, [uid.owner, false, 500000], { code: '42501' });
  await check('Server administrator sees all properties', 'service_role', uid.admin,
    'select id from public.properties', [], { rows: 4 });
  await check('Server administrator can approve a property', 'service_role', uid.admin,
    'update public.properties set approved = true where id = $1 returning id', [privateId], { affectedRows: 1 });
  await check('Administrator still obeys price CHECK constraint', 'service_role', uid.admin,
    propertyInsert, [uid.owner, false, -1], { code: '23514' });
  await check('Service role is not table owner and cannot alter schema', 'service_role', uid.admin,
    'alter table public.properties add column forbidden_local_probe text', [], { code: '42501' });

  await check('Client may create a non-admin own profile', 'authenticated', uid.newClient,
    'insert into public.profiles(id, role, email) values ($1, $2, $3) returning id', [uid.newClient, 'client', 'new-client@example.test'], { affectedRows: 1 });
  await check('Client cannot create an admin profile', 'authenticated', uid.newClient,
    'insert into public.profiles(id, role, email) values ($1, $2, $3)', [uid.newClient, 'admin', 'new-client@example.test'], { code: '42501' });
  await check('Client cannot update their profile role', 'authenticated', uid.client,
    "update public.profiles set role = 'admin' where id = $1", [uid.client], { code: '42501' });
  await check('Admin browser identity is not elevated service execution', 'authenticated', uid.admin,
    'update public.properties set approved = true where id = $1 returning id', [privateId], { affectedRows: 0 });

  await check('Anonymous categories exclude inactive records', 'anon', null,
    'select id from public.service_categories', [], { rows: 1 });
  await check('Anonymous services require approval and active coverage', 'anon', null,
    'select id, title, hourly_rate from public.services order by id', [], { rows: 2 });
  await check('Anonymous cannot see draft service', 'anon', null,
    'select id from public.services where id = $1', [draftService], { rows: 0 });
  await check('Anonymous cannot see inactive approved coverage', 'anon', null,
    'select id from public.services where id = $1', [inactiveService], { rows: 0 });
  await check('Provider updates their draft', 'authenticated', uid.owner,
    'update public.services set title = $1 where id = $2 returning id', ['Changed provider draft', draftService], { affectedRows: 1 });
  await check('Provider cannot edit another provider draft', 'authenticated', uid.owner,
    'update public.services set title = $1 where id = $2 returning id', ['Forbidden provider edit', otherDraft], { affectedRows: 0 });
  await check('Provider cannot self-publish draft', 'authenticated', uid.owner,
    "update public.services set status = 'approved' where id = $1 returning id", [draftService], { code: '42501' });
  await check('Provider cannot modify live approved service', 'authenticated', uid.owner,
    'update public.services set title = $1 where id = $2 returning id', ['Forbidden live edit', approvedService], { affectedRows: 0 });
  const serviceInsert = `insert into public.services(provider_id, title, hourly_rate, duration_minutes, coverage_radius_miles)
    values ($1, 'Fictional service offering', 50, 30, 5) returning id`;
  await check('Merchant can insert own draft (role mismatch repaired)', 'authenticated', uid.merchant,
    serviceInsert, [uid.merchant], { affectedRows: 1 });
  await check('Client cannot impersonate a provider', 'authenticated', uid.client,
    serviceInsert, [uid.client], { code: '42501' });
  const bookingInsert = `insert into public.bookings(service_id, client_email, requested_date, notes)
    values ($1, $2, '2027-01-03', 'Fictional booking request for local test')`;
  await check('Anonymous can insert booking without RETURNING private data', 'anon', null,
    bookingInsert, [approvedService, 'new-client@example.test'], { affectedRows: 1 });
  await check('Anonymous booking for unapproved service denied', 'anon', null,
    bookingInsert, [draftService, 'new-client@example.test'], { code: '42501' });
  await check('Anonymous booking for inactive coverage denied', 'anon', null,
    bookingInsert, [inactiveService, 'new-client@example.test'], { code: '42501' });
  await check('Anonymous cannot read any booking contact information', 'anon', null,
    'select * from public.bookings', [], { code: '42501' });
  await check('Client booking SELECT returns []', 'authenticated', uid.client,
    'select * from public.bookings', [], { rows: 0 });
  await check('Provider sees only their service booking', 'authenticated', uid.owner,
    'select id, client_email from public.bookings order by id', [], { rows: 1 });
  await check('Other provider cannot see provider A booking', 'authenticated', uid.other,
    'select id, client_email from public.bookings where service_id = $1', [approvedService], { rows: 0 });
  await check('Server administrator sees all bookings', 'service_role', uid.admin,
    'select id from public.bookings', [], { rows: 2 });
  await check('Booking email constraint rejects malformed value', 'anon', null,
    bookingInsert, [approvedService, 'not-an-email'], { code: '23514' });

  const roles = (await db.query(`select rolname, rolsuper, rolbypassrls from pg_roles
    where rolname in ('anon', 'authenticated', 'service_role') order by rolname`)).rows;
  const policies = (await db.query(`select tablename, policyname, cmd, roles, qual, with_check
    from pg_policies where schemaname = 'public' order by tablename, policyname`)).rows;
  const report = {
    localOnly: true,
    limitation: 'PostgreSQL WASM in one disposable connection; local auth.uid stub and SET ROLE. No Supabase Auth, PostgREST, cloud migration, real credentials, or multi-connection concurrency was verified.',
    version, migrationPath, cleanSchemaTables,
    migrationSha256: createHash('sha256').update(migration).digest('hex'),
    legacyRowsPreserved: true, migrationReappliedWithoutDataChange: true,
    roles, policies, cases: results.length, results,
  };
  await mkdir('docs/mfalujo23/backend-evidence', { recursive: true });
  await writeFile('docs/mfalujo23/backend-evidence/local-rls-results.json', JSON.stringify(report, null, 2));
  console.log(`LOCAL POSTGRESQL RLS AUDIT: ${results.length}/${results.length} checks passed.`);
} finally {
  await db.close();
}
