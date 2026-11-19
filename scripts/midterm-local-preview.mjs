// Disposable fictional-data transport for local UI verification only.
// It is not Supabase Auth/PostgREST and never connects to a hosted database.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

const port = Number(process.env.MIDTERM_FIXTURE_PORT ?? 54325)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local fixture port.')
const db = await PGlite.create()
for (const file of [
  'supabase/local/auth-bootstrap.sql',
  'supabase/migrations/20261029140000_exam_services_persistence.sql',
  'supabase/migrations/20261118000400_restore_backend_contracts_rls.sql',
  'supabase/migrations/20261118000700_midterm_profile_roles.sql',
  'supabase/local/backend-fixtures.sql',
]) await db.exec(await readFile(file, 'utf8'))
await db.query(`insert into public.services(id,provider_id,title,hourly_rate,duration_minutes,coverage_radius_miles,status)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6','11111111-1111-4111-8111-111111111111','Fictional plumbing review',85,45,8,'approved')`)

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(data))
}
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  if (url.pathname === '/_fixture' && request.method === 'GET') return json(response, 200, { localOnly: true, database: 'disposable fictional PostgreSQL', services: 3 })
  if (request.headers.apikey !== 'synthetic-midterm-public-key') return json(response, 403, { code: '42501', message: 'Local fixture key required.' })
  try {
    if (url.pathname === '/rest/v1/services' && request.method === 'GET') {
      const result = await db.transaction(async (tx) => {
        await tx.exec('set local role anon')
        return tx.query("select id,title,hourly_rate,duration_minutes,coverage_radius_miles from public.services where status='approved' and coverage_active is true order by created_at desc,id")
      })
      return json(response, 200, result.rows.map((row) => ({ ...row, hourly_rate: Number(row.hourly_rate) })))
    }
    if (url.pathname === '/rest/v1/bookings' && request.method === 'POST') {
      if (!request.headers['content-type']?.startsWith('application/json')) return json(response, 415, { message: 'JSON required.' })
      let size = 0; const chunks = []
      for await (const chunk of request) {
        size += chunk.length
        if (size > 8192) return json(response, 413, { message: 'Body too large.' })
        chunks.push(chunk)
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (!body || Array.isArray(body) || Object.keys(body).sort().join(',') !== 'client_email,notes,requested_date,service_id') return json(response, 400, { message: 'Invalid fixture payload.' })
      await db.transaction(async (tx) => {
        await tx.exec('set local role anon')
        await tx.query('insert into public.bookings(service_id,client_email,requested_date,notes) values ($1,$2,$3,$4)', [body.service_id,body.client_email,body.requested_date,body.notes])
      })
      response.writeHead(201); response.end()
      return
    }
    json(response, 404, { message: 'Fixture route unavailable.' })
  } catch (error) {
    json(response, error.code === '42501' ? 403 : 400, { code: error.code ?? 'INVALID_LOCAL_REQUEST', message: 'Local fixture request rejected.' })
  }
})
server.listen(port, '127.0.0.1', () => console.log(JSON.stringify({
  localOnly: true, url: `http://127.0.0.1:${port}`,
  SUPABASE_URL: `http://127.0.0.1:${port}`,
  SUPABASE_PUBLISHABLE_KEY: 'synthetic-midterm-public-key',
  note: 'Only fictional data; no hosted Auth or cloud traffic. All state disappears when this process stops.',
})))
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(async () => { await db.close(); process.exit(0) }))
