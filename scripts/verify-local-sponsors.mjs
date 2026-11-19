import { PGlite } from '@electric-sql/pglite';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sponsorMigrationPath = 'supabase/migrations/20261118000500_eligible_sponsors.sql';
const sponsorMigration = await readFile(sponsorMigrationPath, 'utf8');
const fixture = await readFile('supabase/local/lab6-sponsor-audit-fixture.sql', 'utf8');
const bootstrap = await readFile('supabase/local/auth-bootstrap.sql', 'utf8');
const backendMigration = await readFile('supabase/migrations/20261118000400_restore_backend_contracts_rls.sql', 'utf8');
const backendFixtures = await readFile('supabase/local/backend-fixtures.sql', 'utf8');
const propertyId = '60000000-0000-4000-8000-000000000001';
const sponsorA = '60000000-0000-4000-8000-00000000000a';
const reports = [];

for (const idType of ['uuid', 'text']) {
  const db = await PGlite.create();
  const checks = [];
  async function roleCheck(name, role, sql, params, expectedCode, userId, expectedRows) {
    await db.exec(`begin; set local role ${role};`);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [userId ?? '']);
    let actual;
    try {
      const response = await db.query(sql, params);
      actual = { rows: response.rows, affectedRows: response.affectedRows ?? 0 };
    } catch (error) {
      actual = { error: { code: error.code, message: error.message } };
    } finally {
      await db.exec('rollback');
    }
    if (expectedCode) assert.equal(actual.error?.code, expectedCode, name);
    else assert.equal(actual.error, undefined, name);
    if (expectedRows !== undefined) assert.equal(actual.rows?.length, expectedRows, name);
    checks.push({ name, role, localAuthUid: userId ?? null, sql, params, actual });
  }
  try {
    await db.exec(bootstrap);
    await db.exec(backendMigration);
    await db.exec(backendFixtures);
    // Two observed schema families: original UUID IDs and later TEXT IDs.
    // The TEXT baseline also preserves the observed NOT NULL company_name.
    await db.exec(`
      create table public.sponsors (
        id ${idType} primary key,
        owner_id uuid references auth.users(id),
        name text,
        active boolean not null default false,
        approved boolean not null default false
        ${idType === 'text' ? ', company_name text not null' : ''}
      );
      create table public.property_sponsors (
        property_id uuid not null references public.properties(id),
        sponsor_id ${idType} not null references public.sponsors(id),
        primary key(property_id, sponsor_id)
      );
      alter table public.sponsors enable row level security;
      grant select on public.sponsors to anon, authenticated;
      create policy old_unrestricted_public_read on public.sponsors
        for select to anon, authenticated using (true);
    `);
    await db.exec(sponsorMigration);
    await db.query(`insert into public.properties
      (id,owner_id,title,approved,street,city,state,zip_code,price,bedrooms,bathrooms,square_feet)
      values ($1,'11111111-1111-4111-8111-111111111111','Fictional sponsor audit property',true,
      '50 Example Way','Test City','CA','90032',500000,2,1,900)`, [propertyId]);

    // Run the exact supplied fixture, including its anon SET ROLE and rollback.
    const fixtureOutput = await db.exec(fixture);
    const selection = fixtureOutput.find((r) => r.rows?.some((row) => 'business_name' in row))?.rows;
    assert.deepEqual(selection?.map((r) => r.business_name), ['Sponsor C', 'Sponsor B', 'Sponsor A']);
    const outerPlan = fixtureOutput.flatMap((r) => r.rows ?? []).filter((r) => 'QUERY PLAN' in r);
    assert.ok(outerPlan.length > 0, 'Exact fixture must produce an actual EXPLAIN');

    // Seed the same fictional rows again for additional transaction-scoped tests.
    await db.exec(fixture.split('set local role anon;')[0] + 'commit;');
    const merchant = '55555555-5555-4555-8555-555555555555';
    const other = '11111111-1111-4111-8111-111111111111';
    const admin = '33333333-3333-4333-8333-333333333333';
    const ownerDraft = '60000000-0000-4000-8000-00000000000e';
    await db.query(`insert into public.sponsors(id,owner_id,name,company_name,business_name)
      values ($1,$2,'Merchant draft','Merchant draft','Merchant draft')`, [ownerDraft, merchant]);
    await roleCheck('Merchant inserts own pending inactive draft', 'authenticated',
      `insert into public.sponsors(id,owner_id,name,company_name,business_name)
       values ($1,$2,'New merchant draft','New merchant draft','New merchant draft') returning id`,
      ['60000000-0000-4000-8000-000000000030', merchant], undefined, merchant, 1);
    await roleCheck('Merchant updates own pending draft', 'authenticated',
      'update public.sponsors set business_name=$1 where id::text=$2 returning id',
      ['Revised merchant draft', ownerDraft], undefined, merchant, 1);
    for (const [column, value] of [['approved', true], ['active', true], ['is_active', true], ['status', 'APPROVED']]) {
      await roleCheck(`Merchant cannot self-set ${column}`, 'authenticated',
        `update public.sponsors set ${column}=$1 where id::text=$2 returning id`,
        [value, ownerDraft], '42501', merchant);
    }
    await roleCheck('Merchant cannot transfer draft ownership', 'authenticated',
      'update public.sponsors set owner_id=$1 where id::text=$2 returning id', [other, ownerDraft], '42501', merchant);
    await roleCheck('Another owner cannot read merchant draft', 'authenticated',
      'select id from public.sponsors where id::text=$1', [ownerDraft], undefined, other, 0);
    await roleCheck('Another owner cannot update merchant draft', 'authenticated',
      'update public.sponsors set business_name=$1 where id::text=$2 returning id', ['Forbidden edit', ownerDraft], undefined, other, 0);
    await roleCheck('Trusted admin profile can approve campaign', 'authenticated',
      "update public.sponsors set approved=true,active=true,is_active=true,status='APPROVED' where id::text=$1 returning id",
      [ownerDraft], undefined, admin, 1);
    await roleCheck('Anonymous direct sponsor table read is denied', 'anon', 'select * from public.sponsors', [], '42501');
    await roleCheck('Anonymous impression RPC is denied', 'anon',
      'select public.record_sponsor_placement_impression($1,$2,$3)', [sponsorA, 'sidebar', 'home'], '42501');
    await roleCheck('Service role may invoke coarse impression RPC', 'service_role',
      'select public.record_sponsor_placement_impression($1,$2,$3)', [sponsorA, 'sidebar', 'home']);
    await db.exec('begin; set local role anon;');
    const wrongZip = await db.query('select * from public.eligible_sponsors_for_property($1,$2,$3)', [propertyId, '90210', 'sidebar']);
    const unknownProperty = await db.query('select * from public.eligible_sponsors_for_property($1,$2,$3)', ['60000000-0000-4000-8000-000000000099', '90032', 'sidebar']);
    await db.exec('rollback');
    assert.deepEqual(wrongZip.rows, []);
    assert.deepEqual(unknownProperty.rows, []);
    checks.push({ name: 'Mismatched ZIP and unknown property return []', actual: { wrongZip: wrongZip.rows, unknownProperty: unknownProperty.rows } });

    await db.exec('begin; set local role service_role;');
    await db.query('select public.record_sponsor_placement_impression($1,$2,$3)', [sponsorA, 'sidebar', 'home']);
    await db.exec('reset role;');
    const recorded = (await db.query('select sponsor_id, placement, page_context from public.sponsor_placement_impressions')).rows;
    const counter = (await db.query('select impression_count from public.sponsors where id::text=$1', [sponsorA])).rows;
    await db.exec('rollback');
    assert.equal(recorded.length, 1);
    assert.equal(Number(counter[0].impression_count), 121);
    checks.push({ name: 'Coarse event actually stored and counter incremented (rolled back)', actual: { recorded, counter } });

    const functionBody = sponsorMigration.slice(sponsorMigration.indexOf('function public.eligible_sponsors_for_property')).match(/as \$\$\s*(select[\s\S]*?)\$\$;/i)?.[1];
    assert.ok(functionBody, 'Locate the exact SQL function body for an inner-plan audit');
    const innerSQL = functionBody.replace(/\bp_property_id\b/g, '$1').replace(/\bp_zip\b/g, '$2').replace(/\bp_placement\b/g, '$3');
    const innerPlan = (await db.query('explain (analyze, buffers, format json) ' + innerSQL, [propertyId, '90032', 'sidebar'])).rows;
    const rowsBeforeReapply = (await db.query('select * from public.sponsors order by id')).rows;
    await db.exec(sponsorMigration);
    assert.deepEqual((await db.query('select * from public.sponsors order by id')).rows, rowsBeforeReapply);
    reports.push({ idType, localOnly: true, migrationReappliedWithoutDataChange: true, selection, outerPlan, innerPlan, checks });
    console.log(`SPONSOR LOCAL POSTGRESQL ${idType.toUpperCase()}: C, B, A; pending D excluded; role/privacy/counter checks PASS; real outer and inner EXPLAIN captured.`);
  } finally {
    await db.close();
  }
}
await mkdir('docs/mfalujo23/backend-evidence', { recursive: true });
await writeFile('docs/mfalujo23/backend-evidence/local-sponsor-results.json', JSON.stringify({
  localOnly: true, sponsorMigrationPath,
  sponsorMigrationSha256: createHash('sha256').update(sponsorMigration).digest('hex'),
  limitation: 'Disposable PGlite, fictional rows, auth stubs. Tiny-fixture EXPLAIN is actual but not a production performance measurement. No cloud migration, external URL visit, provider request, or production data.',
  reports,
}, null, 2));
