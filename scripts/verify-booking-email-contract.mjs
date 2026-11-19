import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { BookingCreateSchema } from '../src/schemas/booking.ts'
const db = await PGlite.create()
const cases = [
  ['plus', 'person+tag@example.test', true], ['percent', 'person%tag@example.test', true],
  ['apostrophe', "o'neal@example.test", false], ['exclamation', 'person!tag@example.test', false],
]
const results = []
try {
  for (const file of ['supabase/local/auth-bootstrap.sql','supabase/migrations/20261029140000_exam_services_persistence.sql','supabase/migrations/20261118000400_restore_backend_contracts_rls.sql','supabase/migrations/20261118000700_midterm_profile_roles.sql','supabase/local/backend-fixtures.sql']) await db.exec(await readFile(file,'utf8'))
  for (const [label, email, expected] of cases) {
    const input = { service_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', client_email: email, requested_date: '2027-01-01', notes: 'Fictional email compatibility check' }
    const runtime = BookingCreateSchema.safeParse(input).success
    let sqlAccepted = false, sqlErrorCode = null
    await db.exec('begin; set local role anon')
    try {
      await db.query('insert into public.bookings(service_id,client_email,requested_date,notes) values ($1,$2,$3,$4)',[input.service_id,email,input.requested_date,input.notes])
      sqlAccepted = true
    } catch (error) { sqlErrorCode = error.code }
    finally { await db.exec('rollback') }
    assert.equal(sqlAccepted, expected, label + ' actual booking INSERT')
    if (!expected) assert.equal(sqlErrorCode, '23514')
    assert.equal(runtime, sqlAccepted, label + ' runtime compatibility')
    results.push({ label, sqlAccepted, sqlErrorCode, runtimeAccepted: runtime, matched: true, transactionRolledBack: true })
  }
  await mkdir('docs/mfalujo23/exam-followup-evidence', { recursive: true })
  await writeFile('docs/mfalujo23/exam-followup-evidence/email-contract.json', JSON.stringify({ localOnly: true, fictionalDataOnly: true, method: 'Actual anon INSERTs into migrated bookings table; rollback each case', results }, null, 2) + '\n')
  console.log('BOOKING EMAIL CONTRACT:4actual migrated PostgreSQL INSERT/runtime comparisons PASS')
} finally { await db.close() }
