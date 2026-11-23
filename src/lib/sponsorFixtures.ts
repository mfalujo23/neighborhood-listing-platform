import type { MatchingContext, SponsorCandidate } from './sponsorMatcher'

// Fictional instantiation: Audit 6 supplied only the A/B/C/D tier, miles,
// impressions and approval tuples plus ZIP. Dates/radius/URLs/IDs are test choices.
export const AUDIT_SPONSOR_CONTEXT: MatchingContext = {
  placement: 'sidebar', zipCode: '90032', currentDate: '2026-10-24',
}
const base: SponsorCandidate = {
  id: '', name: '', approved: true, active: true, placement: 'sidebar',
  startDate: '2026-10-01', endDate: '2026-10-31', zipCodes: ['90032'],
  coverageRadiusMiles: 5, tier: 'Silver', distanceMiles: 0, impressions: 0,
  destinationUrl: 'https://example.com/sponsor',
}
export const AUDIT_SPONSOR_CANDIDATES: SponsorCandidate[] = [
  { ...base, id: '60000000-0000-4000-8000-00000000000a', name: 'Sponsor A', tier: 'Silver', distanceMiles: 0.4, impressions: 120 },
  { ...base, id: '60000000-0000-4000-8000-00000000000b', name: 'Sponsor B', tier: 'Gold', distanceMiles: 1.2, impressions: 45 },
  { ...base, id: '60000000-0000-4000-8000-00000000000c', name: 'Sponsor C', tier: 'Gold', distanceMiles: 0.8, impressions: 90 },
  { ...base, id: '60000000-0000-4000-8000-00000000000d', name: 'Sponsor D', tier: 'Platinum', distanceMiles: 0.2, impressions: 10, approved: false },
]
export const SPONSOR_PROPERTY_DEMOS = [
  { property: 'Fictional exact ZIP property', context: { ...AUDIT_SPONSOR_CONTEXT }, candidates: [{ ...base, id: 'exact', name: 'Exact ZIP sponsor', distanceMiles: 25 }] },
  { property: 'Fictional nearby property', context: { ...AUDIT_SPONSOR_CONTEXT, zipCode: '90033' }, candidates: [{ ...base, id: 'nearby', name: 'Nearby sponsor', distanceMiles: 3 }] },
  { property: 'Fictional outside coverage property', context: { ...AUDIT_SPONSOR_CONTEXT, zipCode: '90034' }, candidates: [{ ...base, id: 'outside', name: 'Outside sponsor', distanceMiles: 6 }] },
]
