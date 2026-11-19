import { validateSponsorDestination } from './sponsorUrl'

export type SponsorTier = 'Platinum' | 'Gold' | 'Silver'

export interface SponsorCandidate {
  id: string
  name: string
  approved: boolean
  active: boolean
  placement: string
  startDate: string
  endDate: string
  zipCodes: string[]
  coverageRadiusMiles: number
  tier: SponsorTier
  distanceMiles: number
  impressions: number
  destinationUrl: string
}

export interface MatchingContext {
  placement: string
  zipCode: string
  currentDate: string
}

export const HOUSE_FALLBACK_SPONSOR = {
  id: 'house-fallback',
  name: 'Explore the neighborhood demo',
  destinationUrl: '/listings',
  disclosure: 'House message - no paid sponsor',
}

const TIER_RANK: Record<SponsorTier, number> = {
  Platinum: 3,
  Gold: 2,
  Silver: 1,
}

const ZIP_PATTERN = /^[0-9]{5}(-[0-9]{4})?$/

function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function compareIds(a: string, b: string): number {
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function explainSponsorEligibility(context: MatchingContext, candidate: SponsorCandidate) {
  if (!context || typeof context.zipCode !== 'string' || !ZIP_PATTERN.test(context.zipCode) || !isValidDateOnly(context.currentDate) || typeof context.placement !== 'string' || !/^[a-z][a-z0-9_-]{0,79}$/.test(context.placement)) {
    return { eligible: false, reason: 'invalid_context', geography: 'none' }
  }
  if (!candidate || candidate.approved !== true) return { eligible: false, reason: 'not_approved', geography: 'none' }
  if (typeof candidate.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(candidate.id) || typeof candidate.name !== 'string' || candidate.name.trim() === '') {
    return { eligible: false, reason: 'invalid_identity', geography: 'none' }
  }
  if (candidate.active !== true) return { eligible: false, reason: 'inactive', geography: 'none' }
  if (candidate.placement !== context.placement) return { eligible: false, reason: 'wrong_placement', geography: 'none' }
  if (!isValidDateOnly(candidate.startDate) || !isValidDateOnly(candidate.endDate) || candidate.startDate > candidate.endDate) {
    return { eligible: false, reason: 'invalid_campaign_dates', geography: 'none' }
  }
  if (context.currentDate < candidate.startDate || context.currentDate > candidate.endDate) {
    return { eligible: false, reason: 'outside_campaign_dates', geography: 'none' }
  }
  if (typeof candidate.tier !== 'string' || !Object.hasOwn(TIER_RANK, candidate.tier) || !Array.isArray(candidate.zipCodes) || candidate.zipCodes.some((zip) => typeof zip !== 'string' || !ZIP_PATTERN.test(zip))) {
    return { eligible: false, reason: 'invalid_campaign_scope', geography: 'none' }
  }
  if (!Number.isFinite(candidate.distanceMiles) || candidate.distanceMiles < 0
    || !Number.isFinite(candidate.coverageRadiusMiles) || candidate.coverageRadiusMiles < 0
    || !Number.isSafeInteger(candidate.impressions) || candidate.impressions < 0) {
    return { eligible: false, reason: 'invalid_distance_or_count', geography: 'none' }
  }
  if (!validateSponsorDestination(candidate.destinationUrl).success) {
    return { eligible: false, reason: 'unsafe_destination', geography: 'none' }
  }
  const zip = context.zipCode.slice(0, 5)
  const exactZip = candidate.zipCodes.some((candidateZip) => candidateZip.slice(0, 5) === zip)
  const withinRadius = candidate.distanceMiles <= candidate.coverageRadiusMiles
  return exactZip || withinRadius
    ? { eligible: true, reason: 'eligible', geography: exactZip ? 'exact_zip' : 'radius' }
    : { eligible: false, reason: 'outside_geography', geography: 'none' }
}

function rankEligible(context: MatchingContext, candidates: SponsorCandidate[]) {
  return candidates.filter((candidate) => explainSponsorEligibility(context, candidate).eligible).sort(
    (a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier]
      || a.distanceMiles - b.distanceMiles
      || a.impressions - b.impressions
      || compareIds(a.id, b.id),
  )
}

export function traceSponsorSelection(context: MatchingContext, candidates: SponsorCandidate[]) {
  const ranked = rankEligible(context, candidates)
  return {
    context,
    precedence: ['approved/active/placement/date/geography/safe URL eligibility', 'tier descending', 'distance ascending', 'impressions ascending', 'stable ID ascending'],
    candidates: candidates.map((candidate) => ({ id: candidate.id, name: candidate.name, ...explainSponsorEligibility(context, candidate) })),
    rankedEligibleIds: ranked.map((candidate) => candidate.id),
    selected: ranked[0] ?? null,
  }
}

export function selectSponsor(
  context: MatchingContext,
  candidates: SponsorCandidate[],
): SponsorCandidate | null {
  return rankEligible(context, candidates)[0] ?? null
}
