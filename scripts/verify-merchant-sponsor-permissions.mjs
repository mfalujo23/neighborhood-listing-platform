import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

// Disposable local PostgreSQL only; the Auth stand-ins never enter cloud SQL.
const root = new URL('../', import.meta.url)
const read = name => readFile(new URL(name, root), 'utf8')
const migrationPath = 'supabase/migrations/20261119000200_sponsor_merchant_draft_permissions.sql'
const migration = await read(migrationPath)
const db = await PGlite.create()
const checks = []
const hash = value => createHash('sha256').update(value).digest('hex')
const fixtureUsers = [
  ['11111111-1111-4111-8111-111111111111', 'cis3610-provider-a@example.test'],
  ['22222222-2222-4222-8222-222222222222', 'cis3610-provider-b@example.test'],
  ['33333333-3333-4333-8333-333333333333', 'cis3610-admin@example.test'],
  ['44444444-4444-4444-8444-444444444444', 'cis3610-client@example.test'],
  ['55555555-5555-4555-8555-555555555555', 'cis3610-merchant@example.test'],
]
const ids = Object.fromEntries(['provider','otherProvider','admin','client','merchant'].map((role,index) => [role,fixtureUsers[index][0]]))
async function actor(name, role, user, sql, params=[], expected={rows:1}) {
  await db.exec(`begin; set local role ${role};`)
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [user ?? ''])
  let result, code
  try { result = await db.query(sql, params) } catch (error) { code=error.code }
  finally { await db.exec('rollback') }
  assert.equal(code, expected.code, name)
  if(expected.rows!==undefined) assert.equal(result?.rows.length, expected.rows, name)
  checks.push({name,role,outcome:'passed',sqlstate:code ?? null,rows:result?.rows.length ?? null})
}
async function preserved() {
  const tables=['profiles','properties','services','service_categories','service_category_mappings','bookings','sponsors','property_sponsors','sponsor_placement_impressions']
  const values=[]
  for(const table of tables) values.push([table,(await db.query(`select coalesce(jsonb_agg(j order by j::text),'[]'::jsonb) as data from (select to_jsonb(t) as j from public.${table} t) s`)).rows[0].data])
  return hash(JSON.stringify(values))
}
try {
  await db.exec(await read('supabase/local/auth-bootstrap.sql'))
  await db.exec('alter table auth.users add column email text unique;')
  await db.exec(await read('supabase/cloud/classroom/02-fresh-core.sql'))
  for(const [id,email] of fixtureUsers) await db.query('insert into auth.users(id,email) values($1,$2)',[id,email])
  await db.exec(await read('supabase/cloud/classroom/04-fictional-seed.sql'))
  // Match the historical bundle's seed-date guard in this local fixture only.
  await db.exec("update public.bookings set requested_date=date '2026-11-26';")
  await db.exec(await read('supabase/cloud/classroom/10-sponsors.sql'))
  // Recreate the generic 005 authorization baseline in this disposable DB only.
  await db.exec(await read('supabase/migrations/20261118000500_eligible_sponsors.sql'))
  await db.exec('grant all on public.sponsors,public.property_sponsors,public.sponsor_placement_impressions to anon,authenticated,service_role;')
  const insert="insert into public.sponsors(owner_id,name) values($1,'Fictional local draft') returning id"
  await actor('generic005 permits provider-owned draft before repair','authenticated',ids.provider,insert,[ids.provider])
  const before=await preserved()
  const rpcBefore=(await db.query("select pg_get_functiondef('public.eligible_sponsors_for_property(uuid,text,text)'::regprocedure) as body")).rows[0].body
  await db.exec(migration)
  assert.equal(await preserved(),before)
  checks.push({name:'forward migration preserves all nine table fingerprints',outcome:'passed'})
  const pending=(await db.query("select id from public.sponsors where status='PENDING'")).rows[0].id
  await actor('merchant may create own pending inactive draft','authenticated',ids.merchant,insert,[ids.merchant])
  await actor('merchant may edit own pending inactive draft','authenticated',ids.merchant,'update public.sponsors set business_name=business_name where id=$1 returning id',[pending])
  await actor('merchant cannot assign new draft to another owner','authenticated',ids.merchant,insert,[ids.client],{code:'42501'})
  await actor('merchant cannot insert an approved campaign','authenticated',ids.merchant,"insert into public.sponsors(owner_id,name,approved) values($1,'Fictional local draft',true) returning id",[ids.merchant],{code:'42501'})
  for(const role of ['provider','otherProvider','client','admin']) {
    await actor(`${role} cannot create a sponsor-owner draft`,'authenticated',ids[role],insert,[ids[role]],{code:'42501'})
    await actor(`${role} cannot read merchant draft`,'authenticated',ids[role],'select id from public.sponsors where id=$1',[pending],{rows:0})
    await actor(`${role} cannot update merchant draft`,'authenticated',ids[role],'update public.sponsors set business_name=business_name where id=$1 returning id',[pending],{rows:0})
  }
  for(const [label,change] of [['approval','approved=true'],['status',"status='APPROVED'"],['legacy active','active=true'],['active','is_active=true'],['owner','owner_id=$2']]) {
    await actor(`merchant cannot escalate ${label}`,'authenticated',ids.merchant,`update public.sponsors set ${change} where id=$1 returning id`,label==='owner'?[pending,ids.client]:[pending],{code:'42501'})
  }
  await actor('merchant cannot delete draft','authenticated',ids.merchant,'delete from public.sponsors where id=$1 returning id',[pending],{code:'42501'})
  await actor('anonymous direct sponsor read denied','anon',null,'select id from public.sponsors',[],{code:'42501'})
  await actor('anonymous direct junction read denied','anon',null,'select sponsor_id from public.property_sponsors',[],{code:'42501'})
  await actor('browser direct impression read denied','authenticated',ids.merchant,'select id from public.sponsor_placement_impressions',[],{code:'42501'})
  await actor('service direct impression read denied','service_role',null,'select id from public.sponsor_placement_impressions',[],{code:'42501'})
  const property=(await db.query("select id from public.properties where approved")).rows[0].id
  await actor('anonymous eligible C/B/A RPC remains available','anon',null,"select id from public.eligible_sponsors_for_property($1,'90032','sidebar')",[property],{rows:3})
  await actor('service cannot invoke public eligible RPC','service_role',null,"select id from public.eligible_sponsors_for_property($1,'90032','sidebar')",[property],{code:'42501'})
  await actor('browser cannot invoke impression RPC','authenticated',ids.merchant,"select public.record_sponsor_placement_impression('fixture','sidebar','home')",[],{code:'42501'})
  await actor('service may invoke narrow impression RPC','service_role',null,"select public.record_sponsor_placement_impression('fixture','sidebar','home')")
  await actor('service may approve pending campaign','service_role',null,"update public.sponsors set approved=true,active=true,status='APPROVED',is_active=true where id=$1 returning id",[pending])
  await db.exec(migration)
  assert.equal(await preserved(),before)
  assert.equal((await db.query("select pg_get_functiondef('public.eligible_sponsors_for_property(uuid,text,text)'::regprocedure) as body")).rows[0].body,rpcBefore)
  checks.push({name:'second migration run is idempotent with unchanged data and matcher RPC body',outcome:'passed'})
  await db.exec('create policy unrelated_permissive_policy on public.sponsors for select to anon using(true);')
  let unknown
  try { await db.exec(migration) } catch(error) { unknown=error.code; await db.exec('rollback') }
  assert.equal(unknown,'55000')
  checks.push({name:'unknown policy stops atomic migration for review',outcome:'passed',sqlstate:unknown})
  assert.equal(await preserved(),before)
  const output={scope:'Disposable local PostgreSQL; local Auth stand-ins only. No hosted requests or provider calls.',migrationPath,migrationSha256:hash(migration),executedAtUTC:new Date().toISOString(),status:'passed',checksPassed:checks.length,allFixtureRowsPreserved:true,matcherFunctionBodyUnchanged:true,checks}
  const out=new URL('docs/mfalujo23/hosted-evidence/merchant-policy-local.json',root)
  await mkdir(new URL('.',out),{recursive:true})
  await writeFile(out,JSON.stringify(output,null,2)+'\n')
  console.log(JSON.stringify({status:output.status,checksPassed:checks.length,migrationSha256:output.migrationSha256,hostedRequests:0}))
} finally { await db.close() }
