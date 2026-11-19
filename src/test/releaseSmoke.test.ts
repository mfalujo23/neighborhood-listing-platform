import { describe, expect, it, vi } from 'vitest'
import { monitorAndRollback, smokeDeployment } from '../release/smoke'
const commit = 'a'.repeat(40)
function response(url: string) {
  const path = new URL(url).pathname
  const body = path === '/api/health' ? { status: 'ok', level: 'liveness', commit }
    : path === '/api/services' ? { data: [{ id: 'fixture', title: 'Fictional service', hourly_rate: 50, duration_minutes: 30, coverage_radius_miles: 5 }] } : {}
  return Promise.resolve(new Response(JSON.stringify(body), { status: path === '/api/admin/bookings' ? 401 : path === '/api/webhooks/twilio' ? 410 : 200, headers: { 'X-Content-Type-Options': 'nosniff' } }))
}
describe('Smoke and rollback policy (fake transport and fake provider only)', () => {
  it('checks health source, public narrow data, denied admin, and retired webhook', async () => {
    expect((await smokeDeployment('https://fictional.invalid', commit, { fetchImpl: response })).passed).toBe(true)
  })
  it('blocks stale health, missing security header, and unavailable database', async () => {
    expect((await smokeDeployment('https://fictional.invalid', 'b'.repeat(40), { fetchImpl: response })).passed).toBe(false)
    expect((await smokeDeployment('https://fictional.invalid', commit, { fetchImpl: async () => new Response('{}', { status: 503 }) })).passed).toBe(false)
  })
  it('never marks a partial local check as hosted deployment evidence', async () => {
    const result = await smokeDeployment('http://127.0.0.1:3000', commit, { fetchImpl: response, applicationOnly: true })
    expect(result.applicationOnly).toBe(true); expect(result.hosted).toBe(false)
  })
  it('refuses credentials, query strings, and insecure remote endpoints', async () => {
    for (const base of ['http://fictional.invalid', 'https://user:password@fictional.invalid', 'https://fictional.invalid?token=fictional']) {
      await expect(smokeDeployment(base, commit)).rejects.toThrow()
    }
  })
  it('restores and rechecks a failed candidate but still blocks its release', async () => {
    const restore = vi.fn(async () => {})
    expect(await monitorAndRollback(async () => false, restore, async () => true)).toEqual({ releasePassed: false, rollback: 'verified' })
    expect(restore).toHaveBeenCalledOnce()
    expect(await monitorAndRollback(async () => false, async () => { throw Error('fake provider error') }, async () => true)).toEqual({ releasePassed: false, rollback: 'failed' })
    expect(await monitorAndRollback(async () => { throw Error('fake network outage') }, async () => {}, async () => false)).toEqual({ releasePassed: false, rollback: 'verification_failed' })
    expect(await monitorAndRollback(async () => true, restore, async () => false)).toEqual({ releasePassed: true, rollback: 'not_needed' })
  })
})
