// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LiveListings from '../app/listings/live/live-listings'
import { PublicListingSchema, PublicListingsResponseSchema } from '../schemas/listing'
import { loadPublicListings } from '../lib/publicListings'

const listing = {
  id: '60000000-0000-4000-8000-000000000001', title: 'Fictional stored listing',
  description: null, street: '20 Example Way', city: 'Test City', state: 'CA',
  zip_code: '90032', price: 600000, bedrooms: 3, bathrooms: 2, square_feet: 1200,
  amenities: ['garden'], image_url: null, approved: true,
  created_at: '2026-11-19T00:00:00.000Z',
}
const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json' },
})
function deferred() {
  let resolve!: (value: Response) => void
  const promise = new Promise<Response>(done => { resolve = done })
  return { promise, resolve }
}
let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(response({ data: [listing] }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('public listing response boundary', () => {
  it('accepts the selected public fields, nullable values and a genuine empty result', () => {
    expect(PublicListingSchema.parse(listing)).toEqual(listing)
    expect(PublicListingsResponseSchema.parse({ data: [] })).toEqual({ data: [] })
  })
  it.each([
    { ...listing, owner_id: 'private-owner' },
    { ...listing, approved: false },
    { ...listing, price: '600000' },
    { ...listing, bedrooms: 2.5 },
    { ...listing, square_feet: -1 },
    { ...listing, created_at: 'not-a-timestamp' },
  ])('rejects nonpublic or malformed record %#', value => {
    expect(PublicListingsResponseSchema.safeParse({ data: [value] }).success).toBe(false)
  })
  it('rejects extra top-level fields instead of silently accepting a changed response', () => {
    expect(PublicListingsResponseSchema.safeParse({ data: [listing], debug: 'private' }).success).toBe(false)
  })
})

describe('bounded read request', () => {
  it('makes only the same-origin GET with no authorization or write body', async () => {
    const signal = new AbortController().signal
    expect(await loadPublicListings(signal)).toEqual([listing])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/listings')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers).toEqual({ Accept: 'application/json' })
    expect(init.signal).toBe(signal)
  })
  it('rejects an oversized declared body before parsing it', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { headers: { 'Content-Length': String(1024 * 1024 + 1) } }))
    await expect(loadPublicListings(new AbortController().signal)).rejects.toThrow()
  })
  it('also caps a streamed response without a size header', async () => {
    fetchMock.mockResolvedValue(new Response(' '.repeat(1024 * 1024 + 1)))
    await expect(loadPublicListings(new AbortController().signal)).rejects.toThrow()
  })
})

describe('example listing read states', () => {
  it('shows loading before validated semantic cards and renders text safely', async () => {
    const pending = deferred()
    fetchMock.mockReturnValue(pending.promise)
    render(<LiveListings />)
    expect(screen.getByRole('status').textContent).toBe('Loading listings…')
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    await act(async () => pending.resolve(response({ data: [{ ...listing, description: '<img src=x onerror=alert(1)>', image_url: 'https://example.com/untrusted.jpg' }] })))
    const card = await screen.findByRole('article')
    expect(card.querySelector('header h3')?.textContent).toBe(listing.title)
    expect(card.querySelector('ul')?.textContent).toContain('$600,000.00')
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeDefined()
    expect(card.querySelector('img')).toBeNull()
  })
  it('shows an empty response without substituting sample records', async () => {
    fetchMock.mockResolvedValue(response({ data: [] }))
    render(<LiveListings />)
    await screen.findByText('No approved example listings are available right now.')
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Check listings again' })).toBeDefined()
  })
  it.each(['network', 'http', 'malformed-json', 'private-field'])('fails safely on %s and never displays sample fallback data', async failure => {
    if (failure === 'network') fetchMock.mockRejectedValue(new Error('Private backend detail'))
    if (failure === 'http') fetchMock.mockResolvedValue(response({ error: 'Private backend detail' }, 503))
    if (failure === 'malformed-json') fetchMock.mockResolvedValue(new Response('not-json'))
    if (failure === 'private-field') fetchMock.mockResolvedValue(response({ data: [{ ...listing, owner_id: 'private-owner' }] }))
    render(<LiveListings />)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Listings could not be loaded. Please try again.')
    expect(document.body.textContent).not.toContain('Private backend detail')
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    expect(screen.queryByText('101 Imaginary Garden Lane')).toBeNull()
  })
  it('allows a failed load to retry with Enter and then shows only the real response', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Synthetic outage')).mockResolvedValueOnce(response({ data: [listing] }))
    const user = userEvent.setup()
    render(<LiveListings />)
    const retry = await screen.findByRole('button', { name: 'Retry loading listings' })
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Home' }))
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Sample neighborhood' }))
    await user.tab()
    expect(document.activeElement).toBe(retry)
    await user.keyboard('{Enter}')
    await screen.findByRole('heading', { name: listing.title })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('times out a stalled request and ignores its late response after a successful retry', async () => {
    vi.useFakeTimers()
    const old = deferred()
    fetchMock.mockReturnValueOnce(old.promise).mockResolvedValueOnce(response({ data: [listing] }))
    render(<LiveListings />)
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    const retry = screen.getByRole('button', { name: 'Retry loading listings' })
    await act(async () => { fireEvent.click(retry) })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.getByRole('heading', { name: listing.title })).toBeDefined()
    await act(async () => old.resolve(response({ data: [{ ...listing, title: 'Stale fictional record' }] })))
    expect(screen.queryByText('Stale fictional record')).toBeNull()
    expect(screen.getByRole('heading', { name: listing.title })).toBeDefined()
  })
  it('cancels the read on unmount without initiating any other request', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}))
    const view = render(<LiveListings />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal
    view.unmount()
    expect(signal.aborted).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
