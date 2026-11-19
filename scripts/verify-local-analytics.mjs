import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const migrationPath = 'supabase/migrations/20261118000600_minimized_analytics.sql';
const migration = await readFile(migrationPath, 'utf8');
const fixture = JSON.parse(await readFile('supabase/local/analytics-event-fixtures.json', 'utf8'));
const expected = JSON.parse(await readFile('docs/mfalujo23/evidence/dashboard-actual-results.json', 'utf8'));
const db = await PGlite.create();
const checks = [];
const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const admin = '33333333-3333-4333-8333-333333333333';
const client = '44444444-4444-4444-8444-444444444444';
const propertyA = '70000000-0000-4000-8000-000000000001';
const propertyB = '70000000-0000-4000-8000-000000000002';
const interval = ['2026-11-17T00:00:00Z', '2026-11-19T00:00:00Z'];
async function roleQuery(name, role, uid, sql, params, verify) {
  await db.exec(`begin; set local role ${role};`);
  if (uid) await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
  let actual;
  try { actual = { rows: (await db.query(sql, params)).rows }; }
  catch (error) { actual = { error: { code: error.code, message: error.message } }; }
  finally { await db.exec('rollback'); }
  verify(actual); checks.push({ name, role, actual });
}
async function insert(row) {
  const keys = Object.keys(row);
  return db.query(`insert into public.analytics_events(${keys.join(',')}) values(${keys.map((_, index) => `$${index + 1}`).join(',')})`, Object.values(row));
}
try {
  await db.exec(await readFile('supabase/local/auth-bootstrap.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/20261118000400_restore_backend_contracts_rls.sql', 'utf8'));
  await db.exec(await readFile('supabase/local/backend-fixtures.sql', 'utf8'));
  await db.exec(migration);
  await db.query("update public.profiles set role='property_professional' where id in ($1,$2)", [owner, other]);
  for (const [propertyId, ownerId] of [[propertyA, owner], [propertyB, other]]) await db.query(`insert into public.properties(id,owner_id,title,approved,street,city,state,zip_code,price,bedrooms,bathrooms,square_feet)
    values($1,$2,'Fictional analytics fixture',true,'70 Example Way','Test City','CA','90032',500000,2,1,900)`, [propertyId, ownerId]);
  for (const row of fixture.rows) await insert(row);
  const count = (await db.query('select count(*)::int as count from public.analytics_events')).rows[0].count;
  assert.equal(count, expected.fixtureEventCount);

  await roleQuery('Anonymous raw analytics read denied', 'anon', null, 'select * from public.analytics_events', [], (actual) => assert.equal(actual.error?.code, '42501'));
  await roleQuery('Anonymous aggregate RPC denied', 'anon', null, 'select * from public.analytics_sponsor_ctr($1,$2,null,$3)', [...interval, 'fixture'], (actual) => assert.equal(actual.error?.code, '42501'));
  await roleQuery('Client profile sees zero event rows', 'authenticated', client, 'select event_id from public.analytics_events', [], (actual) => assert.deepEqual(actual.rows, []));
  await roleQuery('Property professional sees own property only', 'authenticated', owner, 'select distinct property_id from public.analytics_events', [], (actual) => assert.deepEqual(actual.rows, [{ property_id: propertyA }]));
  await roleQuery('Other property cannot be read through the aggregate', 'authenticated', owner, 'select * from public.analytics_sponsor_ctr($1,$2,$3,$4)', [...interval, propertyB, 'fixture'], (actual) => assert.deepEqual(actual.rows, []));
  await roleQuery('Administrator CTR uses exact distinct counts', 'authenticated', admin, 'select * from public.analytics_sponsor_ctr($1,$2,null,$3)', [...interval, 'fixture'], (actual) => {
    assert.equal(Number(actual.rows[0].impression_count), 4); assert.equal(Number(actual.rows[0].clicked_impressions), 2); assert.equal(Number(actual.rows[0].ctr_percent), 50);
  });
  await roleQuery('Realtor own-property CTR matches three opportunities', 'authenticated', owner, 'select * from public.analytics_sponsor_ctr($1,$2,$3,$4)', [...interval, propertyA, 'fixture'], (actual) => {
    assert.equal(Number(actual.rows[0].impression_count), 3); assert.equal(Number(actual.rows[0].clicked_impressions), 2);
  });
  await roleQuery('Live source has no fabricated fixture counts', 'authenticated', admin, 'select * from public.analytics_sponsor_ctr($1,$2,null,$3)', [...interval, 'provider_measured'], (actual) => assert.deepEqual(actual.rows, []));
  await roleQuery('Bounded window returns exact fixture count and no hashes', 'authenticated', admin, 'select public.analytics_event_window($1,$2,null,$3) as result', [...interval, 'fixture'], (actual) => {
    assert.equal(actual.rows[0].result.events.length, count); assert.equal(actual.rows[0].result.truncated, false);
    assert.equal(JSON.stringify(actual.rows[0]).includes('payload_hash'), false);
  });
  await roleQuery('Authenticated clients cannot directly insert events', 'authenticated', owner,
    "insert into public.analytics_events(event_id,event_name,occurred_at,property_id,correlation_id,source,payload_hash) values(gen_random_uuid(),'listing_view',now(),$1,gen_random_uuid(),'fixture',$2)", [propertyA, '0'.repeat(64)], (actual) => assert.equal(actual.error?.code, '42501'));

  const duplicate = { ...fixture.rows[0] };
  await db.exec('begin'); let duplicateError;
  try { await insert(duplicate); } catch (error) { duplicateError = { code: error.code, message: error.message }; }
  await db.exec('rollback'); assert.equal(duplicateError?.code, '23505');
  assert.equal((await db.query('select count(*)::int as count from public.analytics_events')).rows[0].count, count);
  checks.push({ name: 'Duplicate event primary key cannot inflate counts', actual: duplicateError });

  await db.exec('begin'); let shapeError;
  try { await insert({ ...fixture.rows[0], event_id: '70000000-0000-4000-8000-000000009099', tool_name: 'get_property_details' }); }
  catch (error) { shapeError = { code: error.code, message: error.message }; }
  await db.exec('rollback'); assert.equal(shapeError?.code, '23514');
  checks.push({ name: 'Database rejects fields belonging to a different event type', actual: shapeError });

  await db.query("insert into public.analytics_events(event_id,event_name,occurred_at,property_id,correlation_id,source,payload_hash) values('70000000-0000-4000-8000-000000009098','listing_view',now()-interval '31 days',$1,gen_random_uuid(),'fixture',$2)", [propertyA, '0'.repeat(64)]);
  const expiredCount = Number((await db.query("select count(*) as count from public.analytics_events where occurred_at < now()-interval '30 days'")).rows[0].count);
  await roleQuery('Anonymous retention procedure is denied', 'anon', null, 'select public.purge_expired_analytics()', [], (actual) => assert.equal(actual.error?.code, '42501'));
  await roleQuery('Service-only retention actually removes expired fixtures (rolled back)', 'service_role', null, 'select public.purge_expired_analytics() as deleted', [], (actual) => assert.equal(Number(actual.rows[0].deleted), expiredCount));
  const before = (await db.query('select event_id from public.analytics_events order by event_id')).rows;
  await db.exec(migration);
  assert.deepEqual((await db.query('select event_id from public.analytics_events order by event_id')).rows, before);
  checks.push({ name: 'Forward migration reapplication preserves all event IDs', actual: { preserved: before.length } });
  const version = (await db.query('select version() as version')).rows[0].version;
  await mkdir('docs/mfalujo23/evidence', { recursive: true });
  await writeFile('docs/mfalujo23/evidence/analytics-local-postgres.json', JSON.stringify({ localOnly: true, version, migrationPath, migrationSha256: createHash('sha256').update(migration).digest('hex'), fixtureRows: count, checks, limitation: 'Disposable PostgreSQL in PGlite, synthetic profiles/properties/events and local auth stubs only. No cloud migration, real participant or provider data.' }, null, 2) + '\n');
  console.log(`ANALYTICS LOCAL POSTGRESQL: ${checks.length} checks PASS; ${count} fictional events; CTR 2/4=50%; ownership/auth/dedup/shape/retention/idempotence verified.`);
} finally { await db.close(); }
