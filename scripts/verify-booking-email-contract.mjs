import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { mkdir, writeFile } from 'node:fs/promises'
import { BookingCreateSchema } from '../src/schemas/booking.ts'
const db = await PGlite.create()
const cases = [
  ['plus', 'person+tag@example.test', true], ['percent', 'person%tag@example.test', true],
  ['apostrophe', "o'neal@example.test", false], ['exclamation', 'person!tag@example.test', false],
]
const results = []
for (const [label, email, expected] of cases) {
  const sql = (await db.query("SELECT $1::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' AS accepted", [email])).rows[0].accepted
  const runtime = BookingCreateSchema.safeParse({ service_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', client_email: email, requested_date: '2027-01-01', notes: 'Fictional email compatibility check' }).success
  assert.equal(sql, expected, label + ' SQL'); assert.equal(runtime, sql, label + ' runtime compatibility')
  results.push({ label, sqlAccepted: sql, runtimeAccepted: runtime, matched: true })
}
await db.close()
await mkdir('docs/mfalujo23/release-evidence', { recursive: true })
await writeFile('docs/mfalujo23/release-evidence/email-contract.json', JSON.stringify({ localOnly: true, fictionalDataOnly: true, results }, null, 2) + '\n')
console.log('BOOKING EMAIL CONTRACT: 4 actual local PostgreSQL/runtime comparisons PASS')
