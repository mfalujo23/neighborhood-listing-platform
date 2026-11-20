import { describe, expect, it } from 'vitest'
import { computeSignature, verifySignature } from '../lib/telephony-webhook'

const now = Date.parse('2026-11-19T00:00:00.000Z')
const params = { CallSid: 'CA00000000000000000000000000000011', From: '+12135550101', To: '+12135550102', CallStatus: 'ringing' }
const env = { NODE_ENV: 'test' as const, TWILIO_AUTH_TOKEN: 'synthetic-primary-token', PUBLIC_CALLBACK_URL: 'https://fixture.invalid/api/webhooks/voice' }
const signature = (token: string, url = env.PUBLIC_CALLBACK_URL) => computeSignature(token, url, params)
describe('Bounded local token overlap, no provider calls', () => {
  it('preserves primary verification and rejects unstaged next token', () => {
    expect(verifySignature(signature(env.TWILIO_AUTH_TOKEN), params, env, now)).toBe(true)
    expect(verifySignature(signature('synthetic-next-token'), params, env, now)).toBe(false)
  })
  it('accepts both staged signatures only inside a bounded overlap', () => {
    const staged = { ...env, TWILIO_AUTH_TOKEN_NEXT: 'synthetic-next-token', TWILIO_TOKEN_OVERLAP_EXPIRES_AT: '2026-11-19T00:30:00.000Z' }
    expect(verifySignature(signature(env.TWILIO_AUTH_TOKEN), params, staged, now)).toBe(true)
    expect(verifySignature(signature(staged.TWILIO_AUTH_TOKEN_NEXT), params, staged, now)).toBe(true)
    expect(verifySignature(signature('unknown-synthetic-token'), params, staged, now)).toBe(false)
  })
  it.each(['invalid', '2026-11-19T00:00:00.000Z', '2026-11-18T23:59:59.999Z', '2026-11-21T00:00:00.000Z'])('rejects the next token for invalid/expired/excessive expiry%s', (expiry) => {
    const staged = { ...env, TWILIO_AUTH_TOKEN_NEXT: 'synthetic-next-token', TWILIO_TOKEN_OVERLAP_EXPIRES_AT: expiry }
    expect(verifySignature(signature(staged.TWILIO_AUTH_TOKEN_NEXT), params, staged, now)).toBe(false)
    expect(verifySignature(signature(env.TWILIO_AUTH_TOKEN), params, staged, now)).toBe(true)
  })
  it('keeps exact callback binding during overlap and rejects oversized signature text', () => {
    const staged = { ...env, TWILIO_AUTH_TOKEN_NEXT: 'synthetic-next-token', TWILIO_TOKEN_OVERLAP_EXPIRES_AT: '2026-11-19T00:30:00.000Z' }
    expect(verifySignature(signature(staged.TWILIO_AUTH_TOKEN_NEXT, 'https://other.invalid/api/webhooks/voice'), params, staged, now)).toBe(false)
    expect(verifySignature('x'.repeat(1000), params, staged, now)).toBe(false)
  })
})
