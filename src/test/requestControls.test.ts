import { describe, expect, it } from 'vitest'
import { createRequestBudget, readJsonBody } from '../lib/request-controls'

describe('Bounded JSON and per-process booking capacity', () => {
  it('rejects unsupported media types before consuming data', async () => {
    const request = new Request('http://local.test', { method: 'POST', body: '{}' })
    await expect(readJsonBody(request)).rejects.toMatchObject({ status: 415 })
  })
  it('rejects oversize declared bodies', async () => {
    const request = new Request('http://local.test', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': '20000' }, body: '{}' })
    await expect(readJsonBody(request)).rejects.toMatchObject({ status: 413 })
  })
  it('enforces actual streamed bytes without trusting Content-Length', async () => {
    const request = new Request('http://local.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: 'x'.repeat(17000) }) })
    await expect(readJsonBody(request)).rejects.toMatchObject({ status: 413 })
  })
  it('accepts bounded JSON and rejects malformed JSON', async () => {
    const make = (body: string) => new Request('http://local.test', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body })
    await expect(readJsonBody(make('{"fictional":true}'))).resolves.toEqual({ fictional: true })
    await expect(readJsonBody(make('{broken'))).rejects.toMatchObject({ status: 400 })
  })
  it('recovers capacity at the exact window boundary', () => {
    let clock = 0
    const budget = createRequestBudget(2, 1000, () => clock)
    expect(budget.take().allowed).toBe(true)
    expect(budget.take().allowed).toBe(true)
    expect(budget.take()).toEqual({ allowed: false, retryAfter: 1 })
    clock = 1000
    expect(budget.take().allowed).toBe(true)
  })
})
