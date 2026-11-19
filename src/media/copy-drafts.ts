import type { CopyRecord, SponsorBrief } from './copy'
import {providerCopyDrafts} from './provider-copy'

export const draftTexts = [
  'Fictional Garden Partner: a fictional gardening guide. Classroom demo only.',
  'Classroom demo only. Explore a fictional gardening guide from Fictional Garden Partner.',
  'Explore Fictional Garden Partner and a fictional gardening guide. Classroom demo only.',
] as const
export const fictionalSponsorBrief: SponsorBrief = {
  id: 'fictional-garden-v1', businessName: 'Fictional Garden Partner', offer: 'a fictional gardening guide',
  address: 'No physical location; fictional classroom setting', url: '/media-demo/partner',
  startsOn: '2026-11-19', endsOn: '2026-11-26', disclaimer: 'Classroom demo only.', permittedTexts: [...draftTexts,...providerCopyDrafts.map(draft=>draft.text)],
}
// Codex-authored drafts, not Gemini/AI Studio output and not human-approved.
export const copyDrafts: CopyRecord[] = draftTexts.map((text, index) => ({
  id: `draft-${index + 1}`, briefId: fictionalSponsorBrief.id, text,
  startsOn: fictionalSponsorBrief.startsOn, endsOn: fictionalSponsorBrief.endsOn, status: 'draft',
  approval: { scope: 'production', actor: null, humanReviewed: false, date: null },
  factTrace: [
    { phrase: fictionalSponsorBrief.businessName, fact: 'businessName' },
    { phrase: fictionalSponsorBrief.offer, fact: 'offer' },
    { phrase: fictionalSponsorBrief.disclaimer, fact: 'disclaimer' },
  ],
}))
