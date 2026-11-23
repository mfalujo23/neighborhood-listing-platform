# Lab 4: Listing and sponsor content approval

## Workflow

1. **Draft:** The author identifies the record, factual source, permitted text, image rights, destination and applicable dates. AI output remains a draft.
2. **Review:** The designated property professional or sponsor representative checks the exact content. Record the object/version, reviewer, decision date, reason and corrections. This is a proposed review procedure, not a claim that a new review occurred.
3. **Approve or return:** The reviewer accepts the exact version, requests a correction or rejects it. Changing a fact, claim, asset or destination requires a new decision.
4. **Publish:** An authorized operator applies the relevant trusted approval state. The application still checks validation, scope, eligibility and dates before display.
5. **Correct or withdraw:** Remove visibility when a source changes, permission is withdrawn or a campaign expires. Keep the old decision for traceability and review the replacement version.

## Mapping to the current implementation

| Content | Authoring gate | Publication gate and present limit |
| --- | --- | --- |
| Property listing | `POST /api/listings` validates the body, verifies the user and fixes `owner_id` to that user with `approved=false`. RLS permits authenticated owners to write only their own unapproved records. This property policy is ownership-based, not provider-role-only. | Public GET selects `approved=true` and explicit public fields. Moving a record to approved requires a trusted operator. A listing approval endpoint or complete review-queue UI is not implemented. |
| Sponsor campaign | Current merchant RLS permits only the merchant's own `PENDING`, unapproved, inactive draft. The owner cannot approve or activate it. | The narrow sponsor query requires approval, activity, placement, dates and property ZIP/radius eligibility. The application validates the destination. The latest permission migration gives browser administrators no bypass; trusted server/operator authorization is required for approval. A complete sponsor approval-queue UI is not implemented. |
| Sponsor copy and media | Strict schemas validate the record. Copy checks source facts, permitted wording, dates and the 120-character limit. Validation returns a draft, not approval. | Production display requires matching approved scope and human-review metadata. The separate exact classroom-copy decision is limited to Michael's approved variant and dates; it is not production business permission. |

The editorial stages above do not introduce a shared database status column. Properties use an approval boolean, campaigns use their actual campaign fields, and copy/media use their own approval records. No service-booking admin endpoint is presented as a listing or sponsor approval endpoint.

## Decisions and responsibilities still needed

Identify the actual source owner and reviewer before production use. Confirm the fields, correction schedule and permitted destinations with the stakeholder or instructor proxy. Do not grant an author approval privileges to bypass review. Each published content version still needs its own approval. Gabriela's approval of integration PR 14 is a code-review record, not approval of a sponsor's claims or assets.

## Source and implementation trace

- Inherited requirements: [PR 6](https://github.com/gavy1997/neighborhood-listing-platform/pull/6), [PR 7](https://github.com/gavy1997/neighborhood-listing-platform/pull/7), [PR 8](https://github.com/gavy1997/neighborhood-listing-platform/pull/8), and [backlog stories 1–3 and 5](https://github.com/mfalujo23/neighborhood-listing-platform/blob/fa9d5780041996cc81c8ca1a25a9703f80d8c2cd/docs/lab4-backlog.md).
- [Listing route](https://github.com/mfalujo23/neighborhood-listing-platform/blob/fa9d5780041996cc81c8ca1a25a9703f80d8c2cd/src/app/api/listings/route.ts) and [property RLS](https://github.com/mfalujo23/neighborhood-listing-platform/blob/fa9d5780041996cc81c8ca1a25a9703f80d8c2cd/supabase/migrations/20261118000400_restore_backend_contracts_rls.sql).
- [Current merchant draft permissions](https://github.com/mfalujo23/neighborhood-listing-platform/blob/fa9d5780041996cc81c8ca1a25a9703f80d8c2cd/supabase/migrations/20261119000200_sponsor_merchant_draft_permissions.sql), [eligibility query](https://github.com/mfalujo23/neighborhood-listing-platform/blob/fa9d5780041996cc81c8ca1a25a9703f80d8c2cd/supabase/migrations/20261118000500_eligible_sponsors.sql) and [destination validation](https://github.com/mfalujo23/neighborhood-listing-platform/blob/fa9d5780041996cc81c8ca1a25a9703f80d8c2cd/src/lib/sponsorUrl.ts).
- [Copy validation/display gate](https://github.com/mfalujo23/neighborhood-listing-platform/blob/fa9d5780041996cc81c8ca1a25a9703f80d8c2cd/src/media/copy.ts), [media approval gate](https://github.com/mfalujo23/neighborhood-listing-platform/blob/fa9d5780041996cc81c8ca1a25a9703f80d8c2cd/src/media/schema.ts) and [separate classroom decision](https://github.com/mfalujo23/neighborhood-listing-platform/blob/fa9d5780041996cc81c8ca1a25a9703f80d8c2cd/docs/mfalujo23/lab7-classroom-approval.md).
