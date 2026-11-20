Michael Falujo

# Lab 7: Media Pipeline and AI-Assisted Marketing Copy

## Asset inventory and provenance

| Asset | Source | Permission/proof | Purpose | Expiration |
|---|---|---|---|---|
| fictional-property | assets/mfalujo23-media/source/property-generated-v1.png | actual-built-in-image-generation; assets/mfalujo23-media/source/generation-record.json; custodian mfalujo23 | informational | None supplied for image; production human review pending |
| fictional-partner | assets/mfalujo23-media/source/partner-banner.svg | self-authored-svg-by-codex; assets/mfalujo23-media/source/partner-banner.svg; custodian mfalujo23 | informational | None supplied for image; production human review pending |
| home-navigation | assets/mfalujo23-media/source/home-icon.svg | self-authored-svg-by-codex; assets/mfalujo23-media/source/home-icon.svg; custodian mfalujo23 | decorative | None supplied for image; production human review pending |

## Crop, export and rendering
The generated PNG is retained outside public. Sharp 0.35.5 crops the property to 16:9 and produces genuine 320/640/1280 WebP and AVIF renditions, recording decoded formats, dimensions, byte counts and SHA256. AVIF is verified as AV1/ftypavif within the HEIF container. The matched 1280 JPEG is 360629 encoded bytes; WebP is 161092 bytes (55.33% fewer file bytes). Simple banner/navigation art remains SVG. Next Image has explicit dimensions, exact-width srcset/sizes and stable fallback boxes.

## Facts-only brief
```json
{
  "brief_id": "fictional-garden-v1",
  "business_name": "Fictional Garden Partner",
  "offer": "a fictional gardening guide",
  "address": "No physical location; fictional classroom setting",
  "url": "/media-demo/partner",
  "starts_on": "2026-11-19",
  "ends_on": "2026-11-26",
  "disclaimer": "Classroom demo only."
}
```

## Three actual generated variants and phrase trace
AI Studio generation: Gemini 4 Hydrogen, High thinking, structured outputs off; captured 2026-11-19T01:28:56.983Z.

### variant-1 (83 characters)
Fictional Garden Partner presents a fictional gardening guide. Classroom demo only.
- "Fictional Garden Partner" -> businessName
- "a fictional gardening guide" -> offer
- "Classroom demo only." -> disclaimer
Status: draft. Human approver/date: pending.

### variant-2 (102 characters)
Fictional Garden Partner: a fictional gardening guide (URL: /media-demo/partner). Classroom demo only.
- "Fictional Garden Partner" -> businessName
- "a fictional gardening guide" -> offer
- "/media-demo/partner" -> url
- "Classroom demo only." -> disclaimer
Status: draft. Human approver/date: pending.

### variant-3 (110 characters)
Fictional Garden Partner lists a fictional gardening guide, 2026-11-19 to 2026-11-26 UTC. Classroom demo only.
- "Fictional Garden Partner" -> businessName
- "a fictional gardening guide" -> offer
- "2026-11-19" -> startsOn
- "2026-11-26" -> endsOn
- "Classroom demo only." -> disclaimer
Status: draft. Human approver/date: pending.

## Factual review and approval workflow
The identical critique prompt was run in Gemini (Gemini 4 Hydrogen, High) and ChatGPT (Instant; exact version not exposed). Both recomputed 83/102/110 correctly and required human review. Gemini preferred variant 1; ChatGPT preferred variant 2. The latter flagged presents/lists as action implications. Both flagged UTC because the review source-facts prefix omitted the UTC context present in the generation instructions. The exact raw outputs are preserved; variant 3 is unchanged and draft.
All actual variants remain in the unpublished review queue. The campaign card uses only a separate, visibly test-only fixture. Production approval fails closed. A named human reviewer must check every sentence and record the decision/date before any approved copy record is created; no Supabase identity or approval is invented. Drafts/raw model outputs remain separate from approved display records.

## Server/UI validation and expiration
The server and UI enforce the 120-character maximum, strict fields, known fact/template vocabulary and the brief date range. Client-supplied approval fields are rejected. Each validation success remains draft. The date gate runs on every request; the client removes active copy at UTC expiration. Unknown/unapproved/rejected/expired content yields a house message.

## Slow-network, missing-image and performance comparison
Actual condition: a loopback-only proxy paces personal raster bodies at 64KiB/s plus 400ms initial delay; all responses use no-store; HTML/JS/CSS/SVG are unthrottled. No Chrome Slow3G or DevTools cache-disabled setting was used. All images completed before each foreground capture.
| Viewport | JPEG observed page transfer B | WebP observed page transfer B | JPEG LCP ms / candidate | WebP LCP ms / candidate |
|---|---|---|---|---|
| 390px | 708801 | 343383 | 5620 / P:no-asset-id | 1876 / IMG:fictional-property |
| 1280px | 679624 | 561469 | 5444 / H1:no-asset-id | 2952 / IMG:fictional-property |
Only these four fresh runs are used. They measure the media-correction build before the provider-draft review overlay. LCP candidates differ and totals include framework/prefetch activity; these single observations do not establish causality or field Core Web Vitals.
Missing-image fallback preserved the 998x561.375px frame before/after. A known draft passed server validation without approval; an unsupported claim was blocked; native-calendar November 18 was rejected as INVALID_CAMPAIGN_DATES. The 390px layout had no horizontal overflow.

## Correction and unpublishing
The maintainer can unpublish by changing the trusted record to draft/rejected or removing it from the display set. Record the affected source/version and correction; preserve raw output; rerun date/length/fact/display checks; require a named human reapproval with date. Expired copy remains unpublished.

## Submission evidence
Repository: https://github.com/mfalujo23/neighborhood-listing-platform . Local demos: /media-demo and /media-demo/baseline. Media publication/deployed-commit references will be added after the actual publication. The individual work is the new personal media pipeline, strict draft/approval gates, tests and recorded provider comparison; previous teammate artifacts are preserved.
