import { PGlite } from '@electric-sql/pglite'
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

const paths = [
  'supabase/local/auth-bootstrap.sql',
  'supabase/migrations/20261029140000_exam_services_persistence.sql',
  'supabase/migrations/20261118000400_restore_backend_contracts_rls.sql',
  'supabase/migrations/20261118000700_midterm_profile_roles.sql',
  'supabase/local/legacy-drift-fixture.sql', 'supabase/local/backend-fixtures.sql',
]
const files = Object.fromEntries(await Promise.all(paths.map(async (name) => [name, await readFile(name, 'utf8')])))
const [bootstrap, exam, repair, forward, legacy, fixtures] = paths.map((name) => files[name])
const reports = []
const owner = '11111111-1111-4111-8111-111111111111'
const merchant = '55555555-5555-4555-8555-555555555555'
const newcomer = '77777777-7777-4777-8777-777777777777'
const approved = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'

for (const scenario of ['fresh-exam', 'legacy-preservation']) {
  const db = await PGlite.create()
  const cases = []
  let canonicalFreshProfileConstraints
  async function check(name, role, uid, sql, params, expected) {
    assert.ok(['anon', 'authenticated', 'service_role'].includes(role))
    await db.exec(`begin; set local role ${role};`)
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ''])
    let actual
    try {
      const result = await db.query(sql, params)
      actual = { rows: result.rows, affectedRows: result.affectedRows ?? 0 }
    } catch (error) { actual = { error: { code: error.code, message: error.message } } }
    finally { await db.exec('rollback') }
    if (expected.code) assert.equal(actual.error?.code, expected.code, name)
    else {
      assert.equal(actual.error, undefined, name)
      if ('rows' in expected) assert.equal(actual.rows.length, expected.rows, name)
      if ('affectedRows' in expected) assert.equal(actual.affectedRows, expected.affectedRows, name)
    }
    cases.push({ name, role, localAuthUid: uid, sql, params, expected, actual })
    console.log(`${scenario}: ${name}: PASS ${JSON.stringify(actual)}`)
  }
  try {
    await db.exec(bootstrap)
    if (scenario === 'fresh-exam') {
      await db.exec(exam)
      const tables = (await db.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map((row) => row.tablename)
      assert.deepEqual(tables, ['bookings','profiles','service_categories','service_category_mappings','services'])
      canonicalFreshProfileConstraints = (await db.query("select conname,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.profiles'::regclass and contype='c'")).rows
      assert.equal(canonicalFreshProfileConstraints.length, 1)
      const definition = canonicalFreshProfileConstraints[0].definition
      for (const role of ['admin','merchant','provider','client']) assert.ok(definition.includes("'" + role + "'"))
      for (const role of ['owner','public','user','property_professional','local_sponsor']) assert.ok(!definition.includes("'" + role + "'"))
    } else await db.exec(legacy)
    await db.exec(repair)
    await db.exec(fixtures)
    await db.query("insert into public.services(id,provider_id,title,hourly_rate,duration_minutes,coverage_radius_miles,status) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7',$1,'Fictional suspended service',50,30,5,'suspended')", [owner])
    const originalProfiles = (await db.query('select id,role,email from public.profiles order by id')).rows
    await db.exec(forward)
    await db.exec(forward)
    assert.deepEqual((await db.query('select id,role,email from public.profiles order by id')).rows, originalProfiles)
    const profileInsert = 'insert into public.profiles(id,role,email) values ($1,$2,$3) returning role'
    for (const role of ['admin','merchant','provider','client']) {
      await check('Exact role accepted by server: ' + role, 'service_role', null, profileInsert,
        [newcomer, role, 'new-profile@example.test'], { affectedRows: 1 })
    }
    for (const role of ['owner','public','user','property_professional','local_sponsor']) {
      await check('New legacy role rejected: ' + role, 'service_role', null, profileInsert,
        [newcomer, role, 'new-profile@example.test'], { code: '23514' })
    }
    await check('Browser cannot create admin identity', 'authenticated', newcomer, profileInsert,
      [newcomer, 'admin', 'new-profile@example.test'], { code: '42501' })
    await check('Authenticated merchant may create own profile', 'authenticated', newcomer, profileInsert,
      [newcomer, 'merchant', 'new-profile@example.test'], { affectedRows: 1 })
    await check('Anonymous sees two approved active services', 'anon', null,
      'select id from public.services', [], { rows: 2 })
    await check('Anonymous cannot read draft service', 'anon', null,
      "select id from public.services where status='draft'", [], { rows: 0 })
    await check('Provider updates own draft', 'authenticated', owner,
      "update public.services set title='Updated fictional draft' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' returning id", [], { affectedRows: 1 })
    await check('Provider cannot update other draft', 'authenticated', owner,
      "update public.services set title='Forbidden other draft' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3' returning id", [], { affectedRows: 0 })
    await check('Provider may edit own suspended service', 'authenticated', owner,
      "update public.services set title='Revised suspended service' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7' returning id", [], { affectedRows: 1 })
    await check('Provider may delete own suspended service', 'authenticated', owner,
      "delete from public.services where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7' returning id", [], { affectedRows: 1 })
    await check('Provider cannot self-publish draft', 'authenticated', owner,
      "update public.services set status='approved' where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' returning id", [], { code: '42501' })
    await check('Administrator may suspend an approved service', 'service_role', null,
      "update public.services set status='suspended' where id=$1 returning status", [approved], { affectedRows: 1 })
    await check('Merchant inserts own draft', 'authenticated', merchant,
      "insert into public.services(provider_id,title,hourly_rate,duration_minutes,coverage_radius_miles) values ($1,'Fictional merchant offering',50,30,5) returning status",
      [merchant], { affectedRows: 1 })
    await check('Anonymous submits private booking', 'anon', null,
      "insert into public.bookings(service_id,client_email,requested_date,notes) values ($1,'resident@example.test','2027-01-03','Fictional appointment request')",
      [approved], { affectedRows: 1 })
    await check('Anonymous cannot read contact information', 'anon', null, 'select * from public.bookings', [], { code: '42501' })
    await check('Client cannot read bookings', 'authenticated', '44444444-4444-4444-8444-444444444444', 'select * from public.bookings', [], { rows: 0 })
    await check('Administrator reads all bookings', 'service_role', null, 'select id from public.bookings', [], { rows: 2 })
    if (scenario === 'legacy-preservation') {
      await check('Existing legacy profile remains readable to server', 'service_role', null,
        "select id from public.profiles where role='owner'", [], { rows: 1 })
      await check('Legacy profile updates require an exact allowed role', 'service_role', null,
        "update public.profiles set email='updated@example.test' where role='owner'", [], { code: '23514' })
    }
    const constraints = (await db.query("select conname,convalidated,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.profiles'::regclass order by conname")).rows
    const rls = (await db.query("select relname,relrowsecurity from pg_class where oid in ('public.profiles'::regclass,'public.service_categories'::regclass,'public.services'::regclass,'public.service_category_mappings'::regclass,'public.bookings'::regclass) order by relname")).rows
    assert.ok(rls.every((row) => row.relrowsecurity))
    reports.push({ scenario, version: (await db.query('select version()')).rows[0].version, canonicalFreshProfileConstraints, existingProfilesPreserved: true, forwardReapplied: true, constraints, rls, cases })
  } finally { await db.close() }
}
const report = {
  localOnly: true,
  limitation: 'Disposable PostgreSQL WASM with local auth.uid stub and SET ROLE. No hosted migration, Supabase Auth/PostgREST, credentials or cloud data.',
  migrations: paths.filter((name) => name.includes('/migrations/')).map((name) => ({ path: name, sha256: createHash('sha256').update(files[name]).digest('hex') })),
  cases: reports.reduce((sum, report) => sum + report.cases.length, 0), reports,
}
await mkdir('docs/mfalujo23/midterm-evidence', { recursive: true })
await writeFile('docs/mfalujo23/midterm-evidence/database-results.json', JSON.stringify(report, null, 2) + '\n')
console.log(`MIDTERM LOCAL POSTGRESQL: ${report.cases}/${report.cases} checks passed.`)
