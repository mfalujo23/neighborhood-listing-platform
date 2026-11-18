# Lab 3: synthetic contract and actual local validation

Canvas source: https://calstatela.instructure.com/courses/133397/assignments/2597693

Prepared November 18, 2026, with Codex assistance for mfalujo23. Local schema/fixture/code tests are implemented. The assignment's Gemini/AI Studio structured-output experiment and its provider evidence have not been performed, and are not replaced by these local fixtures.

## Exact current project type

In `src/schemas/property.ts`:

```ts
export type PropertyListing = z.infer<typeof PropertySchema>
```

The associated strict runtime schema in that file defines the required snake_case contract. Root `types.ts` re-exports `PropertyListing as Property` and `src/lib/api.ts` delegates to the same schema. See ADR 002 for field constraints, design choices, and the generated Draft 7 JSON Schema.

## Why TypeScript alone does not validate JSON

TypeScript's interface/type annotations and assertions are erased when JavaScript runs. An assertion changes the compiler's view, not the payload. `scripts/property-validation-evidence.ts` deliberately demonstrates the unsafe operation below outside the application:

```ts
const asserted = cases.numeric_string_type_mismatch as PropertyListing
try {
  console.log(asserted.price.toFixed(2))
} catch (error: unknown) {
  console.log(error instanceof Error ? `${error.name}: ${error.message}` : String(error))
}
```

Payload A changes only the valid fixture's `price` to the string `"425000"`. Without validation, a consumer calling `price.toFixed(2)` throws because the runtime value is a string. Payload B changes only `price` to the number `-1`. It has the expected primitive type and `.toFixed()` works, but it violates the nonnegative-price business rule. The raw evidence records the actual complete payloads, independent Zod failures, unsafe TypeError, and harmless negative-number formatting result.

## Actual rendering boundary

From `src/app/listings/page.tsx`:

```tsx
export default function ListingsPage() {
  // Treat imported/generated JSON as untrusted data at the rendering boundary.
  const result = validatePropertyCollection(rawFixtures)
```

The returned JSX mounts `ListingsExplorer` only when `result.success` is true; otherwise it shows `Listings unavailable` with no cards. `validatePropertyCollection(input: unknown)` calls `PropertyCollectionSchema.safeParse(input)`. This is a real boundary used by the active page, unlike the previous helper referenced only by tests.

## Local evidence

- `src/test/property.test.ts`: 13 focused tests passed locally, covering the valid five-record fixture; missing ID; negative price; bad ZIP; unknown top-level key; numeric-string mismatch; empty street; state/amenity enums; duplicate amenities/nested unknown fields; invalid IDs/fractional bedroom or area; legal zero values/ZIP+4; failure of the entire collection if one record is invalid; and generated JSON Schema drift.
- `evidence/lab3-property-tests.log`: captured actual test-run output.
- `evidence/lab3-validation-results.txt`: actual complete payloads and Zod result/issue output from `scripts/property-validation-evidence.ts`.
- Final stacked snapshot: clean install, strict zero-warning lint, typecheck, 43 Vitest tests (including the 13 above), 5 inherited Node webhook tests, and production build all passed with Node24.22.3/npm11.21.3. See the `lab23-isolated-*.log` files and `lab2-remediation.md` for the actual base head and the recorded sandbox filesystem limitation.

Run the evidence script without credentials:

```text
node node_modules/tsx/dist/cli.mjs scripts/property-validation-evidence.ts
```

No secret, real property, caller data, interview, or cloud database input is needed. The five fixture records and schematic SVG were authored with Codex locally; no Gemini response, AI Studio setting, or deployment is claimed.

## Provider experiment still required

Use the checked-in generated schema and the prepared prompt in `lab3-ai-studio-prompt.txt` for the actual authorized Gemini/AI Studio structured-output run. Preserve its genuine settings, returned raw JSON, and validation outcome. If the provider rejects a schema keyword, record that limitation and the exact adjustment rather than silently claiming full parity. Student understanding, actual provider execution, and the applicable individual/peer review evidence remain outstanding.
