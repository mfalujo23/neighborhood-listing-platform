import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const sqlPath='supabase/local/mfalujo23-media-fixture.sql';
const sql=await fs.readFile(sqlPath,'utf8');
const fixture=JSON.parse(await fs.readFile('supabase/local/mfalujo23-media-records.json','utf8'));
const db=await PGlite.create();
const checks=[];
async function insert(table,row) {
  const keys=Object.keys(row);
  return db.query(`insert into public.${table}(${keys.join(',')}) values(${keys.map((_,i)=>`$${i+1}`).join(',')})`,Object.values(row));
}
async function denied(name,row) {
  await db.exec('begin');let actual;
  try {await insert('marketing_copy_records',row);} catch(error) {actual={code:error.code,message:error.message};}
  await db.exec('rollback');assert.equal(actual?.code,'23514',name);checks.push({name,actual});
}
try {
  await db.exec(sql);
  for(const row of fixture.assets) await insert('media_asset_records',row);
  for(const row of fixture.copies) await insert('marketing_copy_records',row);
  const assets=(await db.query('select asset_id,approval_status,approval_scope,human_reviewed,production_status from public.media_asset_records order by asset_id')).rows;
  assert.equal(assets.length,3);assert.ok(assets.every(row=>row.approval_scope==='fixture_test'&&!row.human_reviewed&&row.production_status==='draft'));
  checks.push({name:'Three actual local asset records explicitly carry test-only clearance and pending production status',actual:assets});
  const production=(await db.query("select asset_id from public.media_asset_records where approval_status='approved' and approval_scope='production' and human_reviewed=true")).rows;
  assert.deepEqual(production,[]);checks.push({name:'No asset has human-reviewed production approval',actual:production});
  const active=(await db.query("select copy_id,copy_text,approval_scope,human_reviewed from public.marketing_copy_records where approval_status='approved' and approval_scope='fixture_test' and $1::date between starts_on and ends_on",['2026-11-19'])).rows;
  assert.equal(active.length,1);assert.equal(active[0].human_reviewed,false);checks.push({name:'Only the separate test fixture is display-eligible on the injected date',actual:active});
  const expired=(await db.query("select copy_id from public.marketing_copy_records where approval_status='approved' and $1::date between starts_on and ends_on",['2026-11-27'])).rows;
  assert.deepEqual(expired,[]);checks.push({name:'No copy remains eligible after the offer end date',actual:expired});
  const draft=fixture.copies[0];
  await denied('SQL character limit rejects121-character copy',{...draft,copy_id:'bad-length',copy_text:'x'.repeat(121)});
  await denied('SQL dates reject inverted campaigns',{...draft,copy_id:'bad-dates',starts_on:'2026-11-26',ends_on:'2026-11-19'});
  await denied('Production status cannot be approved with human_reviewed=false',{...draft,copy_id:'bad-approval',approval_status:'approved',approval_scope:'production',human_reviewed:false});
  await denied('Production approval cannot omit its actor even with a true review flag',{...draft,copy_id:'missing-actor',approval_status:'approved',approval_scope:'production',human_reviewed:true,approval_actor:null,approval_date:'2026-11-19'});
  const version=(await db.query('select version() as version')).rows[0].version;
  await fs.writeFile('docs/mfalujo23/evidence/lab7-local-approval-records.json',JSON.stringify({localOnly:true,version,sqlPath,sha256:crypto.createHash('sha256').update(sql).digest('hex'),approvalMeaning:'Fixture/test records only. No real person, stakeholder or hosted administrator approved these assets or drafts.',checks},null,2)+'\n');
  console.log(`MEDIA LOCAL POSTGRESQL: ${checks.length} checks PASS;3 test-only assets;production approval absent;draft/expiry/length gates verified.`);
} finally {await db.close();}
