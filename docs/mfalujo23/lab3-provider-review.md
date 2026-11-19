# Lab 3 provider review and returned-data validation

## Observed tools and settings

- Google AI Studio: Gemini 4 Hydrogen (`gemini-4-hydrogen`), High thinking.
- ChatGPT website: visible selector Instant; no model version was exposed.
- AI Studio seed attempt 1: structured output enabled; returned object rejected.
- AI Studio seed attempt 2: structured output disabled; returned array accepted.

Exact prompts, raw responses and settings are in `ai-experiments/lab3/`. Fictional
source notes were supplied to the seed prompt. Earlier local fixtures remain
under their original filename and attribution.

## Decisions from actual reviews

Both reviews recommend Property/Sponsor/PropertySponsor normalization for storage,
while allowing embedded summaries in a public response. Both recommend controlled
amenities for five exchange records, with a join table when the taxonomy or its
metadata becomes dynamic. ADR 001 records these decisions without claiming that
shape validation proves relational integrity.

Both identify unresolved price meaning, zero values, UUID policy, bathroom
increments and sponsor cardinality. No stakeholder response was invented. A
v4-only UUID restriction was not adopted. The runtime already trims required
strings; JSON Schema minLength does not represent that transformation.

## Actual returned examples

Each review supplied five complete test records. Extraction retained their exact
record values and excluded ChatGPT's three earlier illustrative JSON objects.
The extraction index records response spans and capture hashes.

| Provider | Valid | Missing ID | Negative price | Malformed ZIP | Unknown field |
| --- | --- | --- | --- | --- | --- |
| Gemini | accepted | invalid_type at property_id | too_small at price | invalid_format at zip_code | unrecognized_keys: hoa_fee |
| ChatGPT | accepted | invalid_type at property_id | too_small at price | invalid_format at zip_code | unrecognized_keys: virtual_tour_url |

Exact issue objects and executed pass/reject output are in
`ai-experiments/lab3/extracted/canonical-zod-validation-results.json` and
`canonical-zod-validation-terminal.txt`, separate from the models' predictions.

## Active dataset

`data/generated/gemini-ai-studio-seed-attempt2.json` is byte-for-byte identical to
the captured attempt-2 response. All five records pass the runtime collection
validator. The rejected first envelope is retained without silently parsing its
inner string. `/listings` fails closed before rendering an invalid collection.
