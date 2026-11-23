# Lab 7 AI interaction record — mfalujo23

## Actual image-generation interaction

Captured UTC: 2026-11-19T00:21:06Z. Local date: 2026-11-18 America/Los_Angeles. Tool: built-in image_gen.imagegen. Model: not exposed by the built-in tool result.

Exact prompt:

```text
Use case: photorealistic-natural. Asset type: property-listing hero image for a clearly labeled fictional classroom website. Create one photorealistic photograph-style exterior of an entirely invented modest detached home: light cream stucco, a dark simple pitched roof, a natural wood entrance, a small front garden with low shrubs, and a short plain path. Landscape 16:9 composition, front three-quarter viewpoint at eye level, centered home with modest breathing room for a responsive crop. Natural daytime light, realistic building proportions and everyday materials; no luxury or investment promise. This is an AI-generated fictional property, not a photograph of an existing listing. Avoid people, faces, vehicles, license plates, house numbers, street signs, readable text, logos, brands, watermarks, distinctive real landmarks, or any real/private address. Opaque background.
```

Returned artifact: 01a1f0c5-65d0-7f43-a735-8d79969add51/exec-57a878a6-40b7-4932-8e5e-f1e154f10292.png. Saved source: assets/mfalujo23-media/source/property-generated-v1.png. Format: PNG; 1672×941; 3052760 bytes; SHA256 57ae20ac3a5ae69e356e841690732614e6b1ea99b9213877c4ba8abe29012a7a.

Output used: the fictional house image. Inspected result: no visible people, address numbers, readable signs, brands or watermark; cream exterior, wood entry and garden match the prompt. Original is preserved. No realtor approval, model-specific identity, copyright certification or real listing is inferred from generation. Production human review remains pending.

## Actual Codex copy and implementation work

Objective: implement the exact Lab7/Audit7 media and factual-copy requirements in a new personal namespace; preserve prior assets/logs; author three fictional draft variants under 120 characters with phrase traces; make genuine optimized derivatives; fail closed on production approval; add strict runtime/date/length/claim validation and accessible fallback behavior.

Used: actual Sharp decoding/conversion; separate raw drafts and fixture-only approved record; closed factual-template vocabulary; whole-word claim checks; typed metadata and local approval-record evidence. Rejected: renaming PNG as WebP, upscaling a logo into a property photo, claiming a test actor is a human approver, treating absence of banned words as fact verification, false-positive matching of best inside Bestow, serving raw source images publicly, static build-time expiry decisions, and presenting file bytes as network/LCP measurements.

Verification: exact pass totals and actual local SQL/file evidence are stored under evidence/ and the working Lab7 evidence directory. Initial AVIF decoder-label validation and JSX lint errors were corrected; AVIF now retains both actual HEIF decoder format and AV1/ftypavif verification. No source publication or external human message was sent by this agent.

## Initial checkpoint before actual provider experiments

At the original snapshot, AI Studio/Gemini/ChatGPT copy generation, factual review and comparison had not run. The later actual runs are recorded below. The inherited team logs are preserved without re-certification. Use this public fictional brief only for the actual required run and retain its genuine outputs/settings/date and the resulting review decisions.

```text
Using only the approved fictional fixture facts below, create three sponsor blurbs under 120 characters. Do not add superlatives, guarantees, urgency, demographic targeting, or facts not supplied. Return a fact-to-phrase trace for each variant. These are draft classroom examples; do not claim real stakeholder approval.
{
  "id": "fictional-garden-v1",
  "businessName": "Fictional Garden Partner",
  "offer": "a fictional gardening guide",
  "address": "No physical location; fictional classroom setting",
  "url": "/media-demo/partner",
  "startsOn": "2026-11-19",
  "endsOn": "2026-11-26",
  "disclaimer": "Classroom demo only.",
  "permittedTexts": [
    "Fictional Garden Partner: a fictional gardening guide. Classroom demo only.",
    "Classroom demo only. Explore a fictional gardening guide from Fictional Garden Partner.",
    "Explore Fictional Garden Partner and a fictional gardening guide. Classroom demo only."
  ]
}
```


## Actual AI Studio and ChatGPT copy experiment

Generation: Google AI Studio, gemini-4-hydrogen, High, structuredOutputs=false, captured 2026-11-19T01:28:56.983Z. Critiques: Gemini captured 2026-11-19T01:31:03.363Z; ChatGPT website Instant (exact version unexposed), captured 2026-11-19T01:31:37.284Z. Exact prompts/settings/raw outputs and SHA256 checks are in docs/mfalujo23/provider-artifacts/lab7.

Actual generated lengths:83/102/110, independently recounted; exact phrase traces checked. All3 remain draft. The same full critique prompt was sent to both tools. Gemini preferred variant 1; ChatGPT preferred variant 2. Used: source-supported phrases, exact URL, count/trace checks and a review queue. Rejected: treating model critique as human approval, silently accepting presents/lists implications, or deleting UTC from raw output without considering the omitted review context. The generation instruction supplied UTC; the review source prefix did not.

Human decision is pending as of this record; no actor/UUID, stakeholder endorsement or production authorization is fabricated. The existing classroom card remains test-only. Browser transport observations are actual4fresh foreground runs on the media-correction build, separate from provider model performance. No real UAT or telephony run is claimed.

## Actual user classroom decision, November 19, 2026

The user explicitly approved the exact 102-character variant-2 for the classroom demo under Michael Falujo. `config/mfalujo23-classroom-copy-approval.json` records the actual date with date-only precision and exact text/raw-generation/text hashes. This is a separate decision record; no provider draft or critique was rewritten, no Auth UUID was invented, and no production or business stakeholder approval is asserted. Variants 1 and 3 remain unapproved.

Used: a strict classroom-only selector and per-request campaign gates, with separate UI review status. Rejected: backdating, treating classroom approval as production clearance, changing a model's draft status in the raw evidence, or broadening the existing production gate. The frozen media68 publication is PR13 head c4dab3930cacc6286043c7b427248f5ebb9264a6. This follow-up changes no asset binaries or earlier measurements.
