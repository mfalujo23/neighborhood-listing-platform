# ADR 001: Property exchange contract and normalized sponsor storage

## Context

The listing interface consumes a fictional five-record exchange dataset. It needs
one explicit contract for generated JSON, the runtime boundary and TypeScript
consumers. Actual ChatGPT and Gemini reviews, their returned examples and both
AI Studio seed attempts are retained in
[`docs/mfalujo23/ai-experiments/lab3`](../mfalujo23/ai-experiments/lab3/).

## Decision

`src/schemas/property.ts` is the canonical runtime contract. `PropertyListing` is
inferred from it; `src/schemas/property.schema.json` is generated using Zod's
native Draft-07 exporter. The synchronization test compares the checked-in JSON
Schema with a fresh export. No constraint was changed to accommodate the responses.

The contract requires `property_id`, address fields, price, bedrooms, bathrooms,
square feet, amenities and embedded sponsor summaries. Both listing and sponsor
objects reject unknown keys. IDs meet the current UUID validator; numeric values
are finite and nonnegative, with integer bedroom/area values. State and amenity
values use the declared controlled vocabularies. ZIP validation is syntactic
US ZIP/ZIP+4 validation, not an address lookup.

Use controlled amenities for the five-record exchange: `parking`, `pool`,
`garden`, `balcony`, `air_conditioning` and `pet_friendly`. Runtime uniqueness is
enforced by the array refinement; its `uniqueItems` metadata is exported to JSON
Schema. Free text would introduce inconsistent spellings. An Amenity/PropertyAmenity
model is preferable if the vocabulary becomes administrator-managed, localized or
gains per-listing attributes.

Normalize persistent sponsor data into Property, Sponsor and PropertySponsor
relations. Property and Sponsor each have a primary key; the junction uses a
composite property/sponsor key and references both. This avoids duplicated names
and update/deletion anomalies. The embedded `local_sponsors: [{ sponsor_id, name }]`
array is an API/read projection, not a claim that relational storage should
duplicate sponsor records. Shape validation does not establish foreign-key existence.

## Actual provider comparison and validation

Both reviews recommend normalized sponsor storage and controlled amenities for
this exchange. Their exact prompts and complete static analyses are retained;
their predicted validation outcomes were checked against the runtime schema.

Each provider returned one valid record and four intentionally invalid records.
Actual validation accepted each valid record and rejected the other four for
exactly the intended fault: missing ID, negative price, malformed ZIP or unknown
key. ChatGPT's separate partial/schema illustrations were not used as test records.

AI Studio attempt 1 had structured output enabled but returned an outer object
containing encoded JSON. The untouched response failed the collection validator;
the application did not decode it into an accepted value. Attempt 2 returned a
five-record array and passed unchanged. Its capture records structured output as
off, so that array is not described as a successful structured-mode run.

`/listings` imports the exact accepted attempt-2 JSON bytes and validates the
collection before rendering. The original locally authored fixture remains
unchanged at `data/generated/mfalujo23-synthetic-properties.json`. Fictional source
notes were supplied to the seed prompt; the captured response is Gemini's returned
representation, not retroactive authorship of that earlier fixture.

## Alternatives and unresolved business rules

Do not tighten UUIDs to v4-only solely because a review proposed it. The current
validator/export permits a broader UUID domain; a narrower persisted-ID policy
needs a product decision. Zod trims required strings before checking length;
the exported schema does not itself perform that transform.

Stakeholders still need to confirm price meaning/currency, whether zero means a
real value or unknown, bathroom increments, property-versus-listing identity,
duplicate sponsor IDs and lifecycle/address rules. These are questions rather
than interview answers. They do not justify silently changing the exchange fields.
