# Structured JSON output and model comparison

## Original problem
Five generated property records had to satisfy one strict runtime contract; a model's plausible-looking JSON or a TypeScript assertion could not establish validity.

## Initial prompt
Exact prompt, settings, schema and response retained
- [Exact retained record](../../docs/mfalujo23/ai-experiments/lab3/attempt1-settings.json).
- [Exact retained record](../../docs/mfalujo23/ai-experiments/lab3/schema-attempt1.json).
- [Exact retained record](../../docs/mfalujo23/ai-experiments/lab3/gemini-seed-attempt1.raw.json).
- [Exact retained record](../../docs/mfalujo23/ai-experiments/lab3/normalization-prompt.txt).

## AI response summary
AI Studio/Gemini 4 Hydrogen returned an outer object containing encoded JSON on attempt 1. A second prompt produced a real five-record array. Gemini and ChatGPT/Instant separately reviewed the same normalization problem and each supplied one valid and four deliberately invalid complete records.

## Recorded technical critique
Attempt 1 was rejected unchanged at the array boundary. Attempt 2 had structured output off, so it is not evidence of a successful structured-mode run. Property/Sponsor/junction storage was retained while embedded sponsors remain a read projection. Controlled enums and runtime trim were evaluated against actual constraints rather than assumed business rules.

## Revised prompt / actual revision status
Exact executed revision retained
Exact retained revision: [attempt 2](../artifacts/lab3/attempt2-prompt.txt).

## Final result
The exact accepted second-response bytes became data/generated/gemini-ai-studio-seed-attempt2.json. The original Codex-authored synthetic fixture is preserved under its original name. Zod is canonical; inferred TypeScript and generated JSON Schema are checked for consistency.

## Verification evidence
- Attempt 1: invalid_type at root, expected array; attempt 2: five records accepted unchanged
- Each provider's five complete examples: one accepted, four rejected for missing property_id, negative price, bad ZIP or unknown field
- ChatGPT's three earlier partial/schema illustrations were excluded from complete-record tests, not counted as five-record results
- 12 provider-data regressions; provider snapshot passed 55 Vitest + 5 inherited Node tests, strict lint/types/build and actual local /listings HTTP 200 with all five new IDs

## Related GitHub work
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/pull/5)
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/commit/50030fbf26d6d80c5c59b3ce12d7c9678e5a505e)

## Michael’s critique and lesson — student entry required
Michael must compare the two responses across accuracy, completeness, clarity, security, accessibility relevance, assumptions, unsupported claims and useful tests, then state his own evidence-based preference. Both returned complete negative examples behaved as intended; no preference is invented.

The technical critique above is a recorded assisting-agent analysis. Michael must state his own assessment and the verification he personally performed; no student experience or retrospective checkpoint is fabricated.
