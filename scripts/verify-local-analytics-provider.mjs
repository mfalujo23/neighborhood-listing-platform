import {PGlite}from'@electric-sql/pglite';import fs from'node:fs/promises';import assert from'node:assert/strict';import crypto from'node:crypto';
const db=await PGlite.create(),checks=[];
const provider='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',admin='33333333-3333-4333-8333-333333333333',client='44444444-4444-4444-8444-444444444444',merchant='55555555-5555-4555-8555-555555555555',legacy='77777777-7777-4777-8777-777777777777';
const properties=['70000000-0000-4000-8000-000000000001','70000000-0000-4000-8000-000000000002','70000000-0000-4000-8000-000000000003'];
const correctionPath='supabase/migrations/20261119000100_analytics_provider_role_compat.sql';
async function check(name,uid,sql,params,verify){await db.exec('begin;set local role authenticated;');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[uid]);let actual;try{actual={rows:(await db.query(sql,params)).rows};}catch(error){actual={error:{code:error.code,message:error.message}};}finally{await db.exec('rollback');}verify(actual);checks.push({name,actual});}
try{
  await db.exec(await fs.readFile('supabase/local/auth-bootstrap.sql','utf8'));
  await db.exec(await fs.readFile('supabase/migrations/20261118000400_restore_backend_contracts_rls.sql','utf8'));
  await db.exec(await fs.readFile('supabase/local/backend-fixtures.sql','utf8'));
  await db.query("insert into public.profiles(id,role,email)values($1,'property_professional','legacy@example.test')",[legacy]);
  await db.exec(await fs.readFile('supabase/migrations/20261118000600_minimized_analytics.sql','utf8'));
  await db.exec(await fs.readFile('supabase/migrations/20261118000700_midterm_profile_roles.sql','utf8'));
  const correction=await fs.readFile(correctionPath,'utf8');await db.exec(correction);
  for(const[index,uid]of[provider,other,legacy].entries())await db.query(`insert into public.properties(id,owner_id,title,approved,street,city,state,zip_code,price,bedrooms,bathrooms,square_feet)values($1,$2,'Fictional role fixture',true,'70 Example Way','Test City','CA','90032',500000,2,1,900)`,[properties[index],uid]);
  const fixture=JSON.parse(await fs.readFile('supabase/local/analytics-event-fixtures.json','utf8'));
  for(const row of fixture.rows){const keys=Object.keys(row);await db.query(`insert into public.analytics_events(${keys.join(',')})values(${keys.map((_,i)=>`$${i+1}`).join(',')})`,Object.values(row));}
  await db.query("insert into public.analytics_events(event_id,event_name,occurred_at,property_id,correlation_id,source,payload_hash)values('70000000-0000-4000-8000-000000009100','listing_view','2026-11-17T12:00:00Z',$1,'70000000-0000-4000-8000-000000009101','fixture',$2)",[properties[2],'0'.repeat(64)]);
  await check('Canonical provider reads own analytics only',provider,'select distinct property_id from public.analytics_events',[],actual=>assert.deepEqual(actual.rows,[{property_id:properties[0]}]));
  await check('Other provider reads its own distinct property only',other,'select distinct property_id from public.analytics_events',[],actual=>assert.deepEqual(actual.rows,[{property_id:properties[1]}]));
  await check('Provider cannot query another property through the aggregate',provider,'select * from public.analytics_sponsor_ctr($1,$2,$3,$4)',['2026-11-17T00:00:00Z','2026-11-19T00:00:00Z',properties[1],'fixture'],actual=>assert.deepEqual(actual.rows,[]));
  await check('Provider own CTR is2/3',provider,'select * from public.analytics_sponsor_ctr($1,$2,$3,$4)',['2026-11-17T00:00:00Z','2026-11-19T00:00:00Z',properties[0],'fixture'],actual=>{assert.equal(Number(actual.rows[0].impression_count),3);assert.equal(Number(actual.rows[0].clicked_impressions),2)});
  for(const[name,uid]of[['Merchant denied',merchant],['Client denied',client]])await check(name,uid,'select event_id from public.analytics_events',[],actual=>assert.deepEqual(actual.rows,[]));
  await check('Admin reads all three property scopes',admin,'select distinct property_id from public.analytics_events order by property_id',[],actual=>assert.deepEqual(actual.rows,properties.map(property_id=>({property_id}))));
  await check('Preserved legacy role reads its own property only',legacy,'select distinct property_id from public.analytics_events',[],actual=>assert.deepEqual(actual.rows,[{property_id:properties[2]}]));
  await check('Legacy client cannot directly insert analytics',legacy,"insert into public.analytics_events(event_id,event_name,occurred_at,property_id,correlation_id,source,payload_hash)values(gen_random_uuid(),'listing_view',now(),$1,gen_random_uuid(),'fixture',$2)",[properties[2],'0'.repeat(64)],actual=>assert.equal(actual.error?.code,'42501'));
  const role=(await db.query('select role from public.profiles where id=$1',[legacy])).rows[0].role;assert.equal(role,'property_professional');checks.push({name:'Exact-role migration preserved the existing legacy row',actual:{role}});
  const fresh='88888888-8888-4888-8888-888888888888',forbidden='99999999-9999-4999-8999-999999999999';await db.query('insert into auth.users(id)values($1),($2)',[fresh,forbidden]);
  await db.query("insert into public.profiles(id,role)values($1,'provider')",[fresh]);checks.push({name:'Fresh canonical provider profile accepted',actual:(await db.query('select role from public.profiles where id=$1',[fresh])).rows});
  const freshProperty='70000000-0000-4000-8000-000000000004';
  await db.query("insert into public.properties(id,owner_id,title,approved,street,city,state,zip_code,price,bedrooms,bathrooms,square_feet)values($1,$2,'Fresh fictional provider property',true,'80 Example Way','Test City','CA','90032',500000,2,1,900)",[freshProperty,fresh]);
  await db.query("insert into public.analytics_events(event_id,event_name,occurred_at,property_id,correlation_id,source,payload_hash)values('70000000-0000-4000-8000-000000009102','listing_view','2026-11-17T12:00:00Z',$1,'70000000-0000-4000-8000-000000009103','fixture',$2)",[freshProperty,'0'.repeat(64)]);
  await check('Fresh post007 provider reads its assigned analytics only',fresh,'select distinct property_id from public.analytics_events',[],actual=>assert.deepEqual(actual.rows,[{property_id:freshProperty}]));
  await db.exec('begin');let denied;try{await db.query("insert into public.profiles(id,role)values($1,'property_professional')",[forbidden]);}catch(error){denied={code:error.code,message:error.message}}await db.exec('rollback');assert.equal(denied?.code,'23514');checks.push({name:'New legacy-role profile remains prohibited',actual:denied});
  await db.exec(correction);checks.push({name:'Role-policy correction reapplied without changing profiles',actual:{legacyRole:(await db.query('select role from public.profiles where id=$1',[legacy])).rows[0].role}});
  await fs.mkdir('docs/mfalujo23/evidence',{recursive:true});await fs.writeFile('docs/mfalujo23/evidence/analytics-provider-role-postgres.json',JSON.stringify({localOnly:true,version:(await db.query('select version() as v')).rows[0].v,correctionPath,sha256:crypto.createHash('sha256').update(correction).digest('hex'),profileContractDependency:'Published midterm007 from f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5',checks,limitation:'Fictional local auth stubs and data only; no hosted session or provider data.'},null,2)+'\n');
  console.log(`ANALYTICS PROVIDER ROLE: ${checks.length} actual local PostgreSQL checks PASS; canonical ownership/admin/client/merchant/legacy/read-only/profile-contract boundaries verified.`);
}finally{await db.close();}
