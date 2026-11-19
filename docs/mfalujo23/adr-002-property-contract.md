# ADR 002: One source for the synthetic property exchange contract

Date: November 18, 2026. Status: implemented locally; student review pending.

## Decision

`src/schemas/property.ts` is the source of truth. It defines a strict Zod `PropertySchema`, derives `PropertyListing` with `z.infer`, and generates `src/schemas/property.schema.json` using Zod 4's native `z.toJSONSchema` with Draft 7 output. Root `types.ts` re-exports that inferred property type. `parsePropertyPayload` reuses the same schema instead of preserving its previous partial duplicate. A drift test compares the checked-in JSON Schema to fresh generation.

Required fields are `property_id`, `street`, `city`, `state`, `zip_code`, `price`, `bedrooms`, `bathrooms`, `square_feet`, `amenities`, and `local_sponsors`. Identifier formats, nonempty trimmed text, a US state/DC enum, ZIP/ZIP+4 format, nonnegative finite numbers, integer bedrooms/area, nested sponsor UUID/name validation, and rejection of unknown object fields are enforced at runtime. Amenities use controlled values: `parking`, `pool`, `garden`, `balcony`, `air_conditioning`, and `pet_friendly`. Duplicates are rejected by a runtime refinement and exported `uniqueItems: true` metadata.

Canvas did not mandate specific state or amenity enum values. The US-state/DC scope and six amenity choices are explicit local design decisions for this synthetic exercise, not verified stakeholder requirements or a complete global address model. A future real product must revisit locality, currency, property purposes, and availability before reusing this demonstration contract.

## Alternatives

1. Maintain handwritten TypeScript, JSON Schema, and Zod structures independently. Rejected because the inherited repository already contains incompatible camelCase and snake_case shapes, and a partial validator that was not wired into the shown UI.
2. Use unrestricted amenity text. Flexible, but creates synonym drift and unpredictable filtering/display values.
3. Store amenities and sponsor relationships only as normalized SQL join tables. Appropriate for persistence, but this task's exchange boundary still needs a validated JSON representation. This ADR does not alter SQL migrations or authorize database changes.

## Boundary and tradeoffs

`/listings` treats imported generated JSON as unknown runtime data and calls `validatePropertyCollection` before handing records to client components. If any record is invalid, the collection fails closed and a generic unavailable panel replaces all cards. The original teammate fixture and legacy documents are preserved; the local five-record fixture is separately named and explicitly synthetic.

The archive `pages-old/` is excluded by the existing application configuration and is not a supported active view. New active card consumers must supply the canonical type. Strict unknown-key rejection requires a deliberate mapping at any existing database/API boundary whose field names differ; this change does not falsely claim to retrofit every persistence endpoint.

The generated JSON Schema's string formats require a provider/validator that actually enforces formats. Local runtime validation is Zod; the required Gemini/AI Studio provider experiment remains unperformed. Regenerate after schema changes with:

```text
node node_modules/tsx/dist/cli.mjs scripts/export-property-schema.ts
```

The tests check strict rejection, controlled enums, duplicate amenities, nested unknown keys, nonnegative/integer fields, whole-collection failure, and exported-schema drift. Future constraints that cannot be represented by the converter must be documented and tested in both representations before claiming parity.
