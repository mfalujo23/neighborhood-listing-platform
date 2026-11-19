# AI Collaboration Log

## Assignment Checkpoint Prompt

> "Review this React component for semantic HTML, WCAG-oriented keyboard access, responsive behavior, and TypeScript safety. Return: issue, why it matters, smallest change, and a manual test. Do not claim compliance from code alone."

---

## Tool 1: ChatGPT

### Output Summary

- **Issue:** Missing explicit `type="button"` on interactive action buttons in property cards.
- **Why it matters:** Without an explicit type, buttons inside forms can accidentally trigger form submissions on Enter key press.
- **Smallest change:** Add `type="button"` to card buttons.

### Evaluation

- **Accepted suggestions:** Added explicit `type="button"` attributes across interactive components.
- **Rejected suggestions:** Recommending inline `onClick` handlers for static links; preferred native `<a>` anchors for semantic accessibility.
- **Manual test result:** Tabbed through cards with keyboard; verified buttons do not trigger unexpected form submits.

---

## Tool 2: Gemini

### Output Summary

- **Issue:** Lack of visible focus indicators (`focus-visible:ring-2`) on key interactive links and custom filter selects.
- **Why it matters:** Keyboard users relying on Tab navigation cannot identify which element currently has focus.
- **Smallest change:** Applied Tailwind focus ring utility classes (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`).

### Evaluation

- **Accepted suggestions:** Updated `SearchFilters` select controls and `PropertyCard` interactive links with `focus-visible:ring-2`.
- **Rejected suggestions:** Suggestions to replace standard HTML form labels with `aria-label` attributes; retained `<label>` elements for screen reader compatibility.
- **Manual test result:** Tested with `Tab` and `Shift+Tab`; verified distinct outline rings on active elements.

---

## Checkpoint: JSON Schema and Data Contract Architecture

### Prompt Pattern Used

> "Given these fictional listing requirements, propose a strict JSON Schema. Identify ambiguous business rules before writing the schema. Then provide valid and intentionally invalid examples and explain what a validator should reject."

### Models Consulted

- **Gemini (3.5 Flash / AI Studio):** Primary generator for schema structure, Zod definitions, and structured JSON output.
- **ChatGPT:** Secondary critique for identifying edge-case normalization issues and business rule ambiguities.

### Useful Output Accepted

- Strict JSON Schema requiring core property fields and enforcing `additionalProperties: false`.
- Single source of truth Zod schema in TypeScript (`src/schemas/property.ts`).
- AJV validation script with programmatic error logging (`scripts/validate.js`).

### Rejected Output and Corrections

- **Rejected:** Initial output returned `price` as a formatted string (for example, `"$450,000"`).
  - **Correction:** Enforced a strict numeric constraint (`"type": "number"`, `"minimum": 0`) in the prompt system instructions and schema definition.
- **Rejected:** Permitted loose free-text strings for `amenities` (for example, `"Central AC"` versus `"air-conditioning"`).
  - **Correction:** Adopted controlled enum values in the Zod contract and documented the decision in `docs/adr/001-data-contract.md`.

### Verification Summary

- **Seed records:** 100% of generated records passed local AJV validation (`node scripts/validate.js`).
- **Invalid fixtures:** Unit tests verified failure cases for missing ID, negative price, invalid ZIP format, and unexpected additional fields.
- **Privacy verification:** Confirmed zero personal, secret, or real client data present in prompts or committed files.

---

## Boundary Validation Implementation

- Implemented Zod schema parsing in `src/lib/api.ts`.
- Structured directory hierarchy (`src/lib/` and `src/test/`) and verified native TypeScript execution via `tsx`.
- Verified JSON schema validation using `node scripts/validate.js`.

---

## Midterm Practical Exam — Initial Requirements Draft

- **Tool:** ChatGPT
- **Prompt:** "Please explain these two assignments, and let's do them for this class for Rahim Islam step by step." The exam instructions were provided as context.
- **Output used:** The three user stories, acceptance criteria, estimates, traceability paths, and open questions in `docs/requirements.md`.
- **Output rejected / rationale:** No implementation or security claims were accepted without checking the migration, routes, and test results. The district/coverage-zone and booking-policy details remained open questions because the instructions did not fully define them.
- **Verification:** Compared the stories with the three stakeholder roles and requirements in the exam instructions; recorded unresolved schema questions in `docs/requirements.md`.
- **Associated commit:** Pending.
- **Other AI tools:** Gemini and Google AI Studio have not been used for this draft.

# AI Provenance Journal

| Step / Tool | Prompt Summary | Model Output Used | Model Output Rejected & Rationale | Verification Method | Associated Git Commit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Part 3: DDL Architecture** | Generated PostgreSQL DDL with strict checks, foreign keys, and RLS policies. | DDL structure for `profiles`, `services`, `bookings`, `service_categories`, and junction tables. | Rejected initial attempt that omitted `status IN ('draft', 'pending', 'approved', 'suspended')` check constraint. | Executed migration via Supabase CLI; verified table creation in remote dashboard. | `feat(db): add versioned persistence schema for local services` |
| **Part 4: RLS Policies** | Generated least-privilege RLS policies for anonymous, provider, client, and admin roles. | Provider-scoped `UPDATE`/`DELETE` policy restricting modifications to `draft` or `suspended` listings. | Rejected policy allowing providers to delete live `approved` listings without admin oversight. | Executed SQL audit matrix tests in Supabase SQL Editor as different roles. | `security(rls): enforce role-based access control policies` |
| **Part 5: Data Contract** | Generated Zod validation schema for service POST requests with strict property checks. | Zod object schema with `.strict()` modifier and min/max length constraints. | Rejected default `.passthrough()` validation as it allows unexpected body attributes. | Ran unit tests against API handler using invalid payloads (missing titles, extra keys). | `feat(api): implement runtime validation contract and service handlers` |
| **Part 6: UI Component** | Generated responsive Tailwind React component for `ServiceCard.tsx`. | Semantic `<article>`, `<header>`, `<ul>` structure and Tailwind `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. | Rejected generic `<div>` layout and buttons missing explicit `aria-label` attributes. | Tested WCAG keyboard navigation (`Tab`/`Enter`) and inspected DOM structure. | `feat(ui): add accessible semantic ServiceCard component` |

## Week 6 Lab 6 — Adversarial Sponsor Matching Review

### Prompt

> Act as an adversarial tester for the contextual sponsor-selection function. Find edge cases involving dates, ZIP codes, distance, ties, approval status, empty data, and unsafe URLs. Do not suggest user profiling or sensitive housing targeting.

### Tools Consulted

- **Gemini:** Reviewed sponsor-selection and destination-URL edge cases.
- **ChatGPT:** Critiqued the matching rules and Gemini's findings.

### Useful Findings and Decisions

- Added checks for inclusive campaign date boundaries, malformed or inverted date ranges, exact ZIP matches, radius boundaries, inactive or pending sponsors, empty candidate lists, and deterministic tie-breaking.
- Kept tier ahead of distance in ranking as an intentional policy: eligible higher-tier sponsors rank first; distance, impression count, and sponsor ID break later ties.
- Require valid distance, radius, and impression values so missing or invalid data cannot affect ranking unpredictably.
- Use a stable sponsor-ID comparison for the final tie-break.
- Hardened destination URL validation to require public HTTPS URLs and reject credentials, IP addresses, local or reserved hostnames, and nonstandard ports. The redirect route also validates the stored destination before redirecting.
- Treat campaign dates as inclusive calendar dates. ZIP targeting uses exact ZIP matching; radius matching is evaluated separately.

### Rejected or Qualified Findings

- Treated “a higher-tier sponsor may be farther away than a lower-tier sponsor” as a policy choice to document, rather than an implementation defect.
- Did not add DNS lookups or fetch sponsor destinations during validation. The app redirects the visitor and does not request the destination from the server.

### Verification

- Added sponsor-matching and URL-validation tests.
- `npm test`: 33 tests passed across 3 test files.
- `npm run build`: completed successfully.
- Tested the redirect route with an invalid sponsor ID and an unsafe stored URL; it returned errors instead of redirecting. A valid approved sponsor destination returned HTTP 302.

### Associated Commit

`f5bf704` — Complete Week 6 sponsor matching engine.


## Lab 3: observed provider reviews and returned-data validation

| Step / Tool | Prompt Summary | Model Output Used | Model Output Rejected & Rationale | Verification Method | Associated Git Commit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AI Studio / Gemini 4 Hydrogen, High | Generate five records from supplied fictional notes under the configured schema; exact prompt/settings: [attempt 1](mfalujo23/ai-experiments/lab3/attempt1-settings.json) | Recorded the actual structured-output setting and first response as evidence | Outer object containing encoded JSON was rejected; it was not silently repaired into accepted data | Canonical collection validator returned invalid_type at the root, expected array | 50030fbf26d6d80c5c59b3ce12d7c9678e5a505e |
| AI Studio / Gemini 4 Hydrogen, High | Correct only the output shape; [exact second prompt](mfalujo23/ai-experiments/lab3/attempt2-prompt.txt) | Exact second-response JSON array is the active five-record fixture | This capture records structured output as off; no successful structured-mode claim is made for attempt 2 | All five records pass unchanged; active page validates before rendering; original local fixture bytes preserved | 50030fbf26d6d80c5c59b3ce12d7c9678e5a505e |
| AI Studio / Gemini 4 Hydrogen, High | Review ambiguity, normalization, amenities and five examples; [exact prompt](mfalujo23/ai-experiments/lab3/normalization-prompt.txt), [full output](mfalujo23/ai-experiments/lab3/gemini-normalization.json) | Normalized Property/Sponsor/junction storage, embedded read projection, controlled amenities; returned valid and negative examples | No unconfirmed v4-only UUID or business-semantic change; exported minLength warning does not replace existing runtime trim | Executed five returned examples: one accepted; four rejected only for missing ID, negative price, malformed ZIP or hoa_fee | 50030fbf26d6d80c5c59b3ce12d7c9678e5a505e |
| ChatGPT website / Instant; version not exposed | Same [review prompt](mfalujo23/ai-experiments/lab3/normalization-prompt.txt); [full output](mfalujo23/ai-experiments/lab3/chatgpt-normalization.json) | Normalization and controlled-enum recommendations; all five complete returned records | Three earlier partial/schema illustrations excluded from the complete-record tests; intentionally invalid records remain negative cases | Executed five complete examples: one accepted; four rejected for intended faults, including virtual_tour_url | 50030fbf26d6d80c5c59b3ce12d7c9678e5a505e |
| Local Node/Zod validation / Codex | Validate actual returned examples and both raw seed attempts against the canonical source without changing constraints | Assertion-based validator, captured exact issues, twelve provider-data regression cases, portable source/prompt capture | Model predictions alone are not treated as executed results; original local fixtures are not relabeled as Gemini output | scripts/verify-lab3-provider-data.ts; providerPropertyData.test.ts; exact output in extracted/canonical-zod-validation-terminal.txt | 50030fbf26d6d80c5c59b3ce12d7c9678e5a505e |

The published integration uses the exact returned second-attempt JSON bytes.
ADR 001 records the controlled-amenity decision, storage/projection distinction,
accepted/rejected recommendations and unresolved business questions.

