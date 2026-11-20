import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import SponsorPlacement from '../components/SponsorPlacement'
import { AUDIT_SPONSOR_CANDIDATES as candidates, AUDIT_SPONSOR_CONTEXT as context, SPONSOR_PROPERTY_DEMOS } from '../lib/sponsorFixtures'
import { explainSponsorEligibility, selectSponsor, traceSponsorSelection } from '../lib/sponsorMatcher'
import { createCoarseImpression, handleSponsorRedirect, sponsorRedirectPath } from '../lib/sponsorRuntime'
import { validateSponsorDestination } from '../lib/sponsorUrl'

const sponsor = candidates[2]
const publicSponsor = { id: sponsor.id, business_name: sponsor.name, destination_url: sponsor.destinationUrl }
const propertyId = '60000000-0000-4000-8000-000000000001'
const path = sponsorRedirectPath(sponsor.id, propertyId, '90032', 'sidebar')
const request = (suffix = '') => new Request(`http://localhost${path}${suffix}`)

describe('Lab 6 eligibility and audit trace', () => {
  test('matches the teacher A/B/C/D tuples and excludes D before tier ranking', () => {
    const trace = traceSponsorSelection(context, candidates)
    expect(trace.rankedEligibleIds).toEqual([candidates[2].id, candidates[1].id, candidates[0].id])
    expect(trace.selected?.name).toBe('Sponsor C')
    expect(trace.candidates[3]).toMatchObject({ eligible: false, reason: 'not_approved' })
  })
  test('rejects inactive and expired campaigns', () => {
    expect(explainSponsorEligibility(context, { ...sponsor, active: false }).reason).toBe('inactive')
    expect(selectSponsor(context, [{ ...sponsor, endDate: '2026-10-23' }])).toBeNull()
  })
  test('rejects a future campaign and incorrect placement', () => {
    expect(selectSponsor(context, [{ ...sponsor, startDate: '2026-10-25' }])).toBeNull()
    expect(selectSponsor({ ...context, placement: 'footer' }, [sponsor])).toBeNull()
  })
  test('normalizes ZIP+4 to ZIP5 without accepting partial ZIPs', () => {
    expect(explainSponsorEligibility({ ...context, zipCode: '90032-1234' }, { ...sponsor, distanceMiles: 99 }).geography).toBe('exact_zip')
    expect(selectSponsor({ ...context, zipCode: '9003' }, [sponsor])).toBeNull()
  })
  test('unsafe high-tier destination cannot displace a safe sponsor', () => {
    const unsafe = { ...sponsor, id: 'unsafe', tier: 'Platinum' as const, destinationUrl: 'javascript:alert(1)' }
    expect(explainSponsorEligibility(context, unsafe).reason).toBe('unsafe_destination')
    expect(selectSponsor(context, [unsafe, sponsor])?.id).toBe(sponsor.id)
  })
  test('rejects missing IDs and unnamed placements', () => {
    expect(selectSponsor(context, [{ ...sponsor, id: '' }])).toBeNull()
    expect(selectSponsor(context, [{ ...sponsor, name: ' ' }])).toBeNull()
  })
  test('stable tie does not mutate input and is independent of input order', () => {
    const a = { ...sponsor, id: 'a' }; const b = { ...sponsor, id: 'b' }
    const input = [b, a]
    expect(selectSponsor(context, input)?.id).toBe('a')
    expect(input.map((item) => item.id)).toEqual(['b', 'a'])
    expect(selectSponsor(context, [...input].reverse())?.id).toBe('a')
  })
  test('three property contexts produce exact ZIP, nearby, and house fallback', () => {
    expect(SPONSOR_PROPERTY_DEMOS.map((demo) => traceSponsorSelection(demo.context, demo.candidates).selected?.id ?? 'house')).toEqual(['exact', 'nearby', 'house'])
  })
})

describe('Approved-record redirect without outbound network', () => {
  test('redirects only to the currently selected stored URL', async () => {
    const lookup = vi.fn().mockResolvedValue(publicSponsor)
    const response = await handleSponsorRedirect(request(), lookup)
    expect(lookup).toHaveBeenCalledWith(propertyId, '90032', 'sidebar')
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://example.com/sponsor')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
  test('rejects client destination injection without querying', async () => {
    const lookup = vi.fn()
    expect((await handleSponsorRedirect(request('&url=https%3A%2F%2Fevil.example'), lookup)).status).toBe(400)
    expect(lookup).not.toHaveBeenCalled()
  })
  test('rejects duplicate parameters and missing property context', async () => {
    const lookup = vi.fn()
    expect((await handleSponsorRedirect(request('&zip=90033'), lookup)).status).toBe(400)
    expect((await handleSponsorRedirect(new Request(`http://localhost/api/sponsors/redirect?sponsor_id=${sponsor.id}`), lookup)).status).toBe(400)
    expect(lookup).not.toHaveBeenCalled()
  })
  test('returns no redirect after approval, placement, date or geography eligibility is lost', async () => {
    const response = await handleSponsorRedirect(request(), async () => null)
    expect(response.status).toBe(404)
    expect(response.headers.get('location')).toBeNull()
  })
  test('does not redirect a different eligible sponsor ID', async () => {
    expect((await handleSponsorRedirect(request(), async () => ({ ...publicSponsor, id: candidates[1].id }))).status).toBe(404)
  })
  test('unsafe stored URL produces the exact safe client error', async () => {
    const response = await handleSponsorRedirect(request(), async () => ({ ...publicSponsor, destination_url: 'javascript:alert(1)' }))
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ error: { code: 'UNSAFE_SPONSOR_URL', message: 'Destination must be a public HTTPS URL.', issues: [{ path: [], message: 'Destination must be a public HTTPS URL.' }] } })
    expect(response.headers.get('location')).toBeNull()
  })
  test('backend failure returns a coarse error without leaking internals', async () => {
    const response = await handleSponsorRedirect(request(), async () => { throw new Error('private raw backend details') })
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('private')
  })
})

describe('Disclosures, validation and coarse telemetry', () => {
  test('URL validation exposes exact serializable success and error objects', () => {
    expect(validateSponsorDestination(' https://example.com/approved ')).toEqual({ success: true, url: 'https://example.com/approved' })
    expect(validateSponsorDestination('javascript:alert(1)')).toEqual({ success: false, error: { code: 'UNSAFE_SPONSOR_URL', message: 'Destination must be a public HTTPS URL.', issues: [{ path: [], message: 'Destination must be a public HTTPS URL.' }] } })
  })
  test('records only coarse fields with an injected clock; rejects IPs/free text', () => {
    const input = { sponsorId: sponsor.id, placement: 'sidebar', pageContext: 'home' }
    expect(createCoarseImpression(input, () => new Date('2026-10-24T12:00:00Z'))).toEqual({ ...input, timestamp: '2026-10-24T12:00:00.000Z' })
    expect(createCoarseImpression({ ...input, ip: '192.0.2.1' })).toBeNull()
    expect(createCoarseImpression({ ...input, pageContext: 'arbitrary private text' })).toBeNull()
  })
  test('paid placement has visible and accessible commercial disclosure', () => {
    const markup = renderToStaticMarkup(React.createElement(SponsorPlacement, { propertyId, targetZip: '90032', sponsor: publicSponsor }))
    expect(markup).toContain('Sponsored — paid local partner')
    expect(markup).toContain('aria-label="Sponsored partner: visit Sponsor C (opens a new tab)"')
    expect(markup).toContain('rel="sponsored noopener noreferrer"')
    expect(markup).toContain('aria-describedby="sponsor-disclosure-')
    expect(markup).not.toContain('href="https://')
  })
  test('house fallback is clearly unpaid and links internally', () => {
    const markup = renderToStaticMarkup(React.createElement(SponsorPlacement, { propertyId, targetZip: '90032', sponsor: null }))
    expect(markup).toContain('House message - no paid sponsor')
    expect(markup).toContain('href="/listings"')
    expect(markup).not.toContain('Visit sponsored partner')
  })
})
