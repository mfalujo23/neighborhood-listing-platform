import { PGlite } from '@electric-sql/pglite'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

// Creates only disposable fictional databases. Accepts no URL or credential.
const db = await PGlite.create()
let restored
const tables = ['profiles','properties','service_categories','services','service_category_mappings','bookings']
async function snapshot(database) {
  const rows = {}
  for (const table of tables) rows[table] = (await database.query('select * from public.' + table + ' order by 1,2')).rows
  return rows
}
try {
  for (const file of [
    'supabase/local/auth-bootstrap.sql',
    'supabase/migrations/20261029140000_exam_services_persistence.sql',
    'supabase/migrations/20261118000400_restore_backend_contracts_rls.sql',
    'supabase/migrations/20261118000700_midterm_profile_roles.sql',
    'supabase/local/backend-fixtures.sql',
  ]) await db.exec(await readFile(file,'utf8'))
  const before = await snapshot(db)
  const checkpointAt = new Date().toISOString()
  const dump = await db.dumpDataDir('gzip')
  const archive = Buffer.from(await dump.arrayBuffer())
  await mkdir('.cache/recovery',{recursive:true})
  await writeFile('.cache/recovery/fictional-pglite-checkpoint.tgz',archive)
  await db.exec('delete from public.bookings')
  assert.equal((await db.query('select count(*)::int as count from public.bookings')).rows[0].count,0)
  const restoreStart = performance.now()
  restored = await PGlite.create({ loadDataDir: new Blob([await readFile('.cache/recovery/fictional-pglite-checkpoint.tgz')]) })
  const after = await snapshot(restored)
  assert.deepEqual(after,before,'Restored fictional checkpoint must reproduce every row')
  const measuredLocalRecoveryMs = Math.round(performance.now()-restoreStart)
  await restored.exec('begin; set local role anon')
  let denied
  try { await restored.query('select * from public.bookings') }
  catch(error) { denied={code:error.code,message:error.message} }
  finally { await restored.exec('rollback') }
  assert.equal(denied?.code,'42501')
  const report = {
    localOnly:true,engine:(await restored.query('select version()')).rows[0].version,
    pgliteVersion:'0.5.16',checkpointAt,archiveBytes:archive.byteLength,
    archiveSha256:createHash('sha256').update(archive).digest('hex'),
    restoredRows:Object.fromEntries(tables.map((table)=>[table,after[table].length])),
    exactRowsRestored:true,restoredAnonymousBookingRead:denied,measuredLocalRecoveryMs,
    operationalRpo:'Not established: no hosted backup schedule or WAL/PITR has been configured or verified.',
    operationalRto:'Not established: this measurement covers only a tiny local fictional PGlite checkpoint.',
    limitation:'PGlite data-directory snapshot, not a hosted PostgreSQL dump/PITR restore. Archive remains in ignored .cache, containing only fictional test data.',
  }
  await mkdir('docs/mfalujo23/release-evidence',{recursive:true})
  await writeFile('docs/mfalujo23/release-evidence/local-restore.json',JSON.stringify(report,null,2)+'\n')
  console.log(JSON.stringify({localRestore:'passed',restoredRows:report.restoredRows,measuredLocalRecoveryMs,restoredAnonymousSqlState:denied.code}))
} finally {
  await restored?.close()
  await db.close()
}
