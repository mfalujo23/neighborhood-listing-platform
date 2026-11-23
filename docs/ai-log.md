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



## Midterm services and booking implementation

| Step / Tool | Prompt Summary | Model Output Used | Model Output Rejected & Rationale | Verification Method | Associated Git Commit |
| --- | --- | --- | --- | --- | --- |
| Codex | Complete Version B services and booking UI using the exact required paths and grid. | Mounted /services, validated responses, shared booking schema, semantic cards, keyboard/focus handling, server-only supabaseServer.ts. | Unchecked runtime casts and event.currentTarget access after await could crash the interface. | DOM keyboard/API tests and exact isolated lint/type/test/build checks linked below. | Backend base5a51dcb; implementation f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5. |
| Codex | Enforce the four required roles while retaining existing data. | Fresh canonical profile table and forward007 constraint that blocks all new legacy roles. | Broadening new role choices for historical rows would not meet the requirement; no silent legacy conversion. | Actual disposable PostgreSQL fresh/legacy assertions, raw42501/23514/empty rows, preserved profile data and reapplication. | f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5. |
| Codex | Verify administrator approval/suspension and privacy boundaries. | Strict authorized service status updates; receipt-only booking insertion. | Provider elevation, unknown update fields, contact-data echoes and hidden fixture fallback. | API/admin tests plus actual local SQL; optional fixture preview is clearly labeled and has no hosted Auth. | f4ea7ab7adb0a4a50e7506f602bfda92282b2ae5. |

The [personal midterm journal](mfalujo23/midterm-ai-log.md) and
[verification record](mfalujo23/midterm-verification.md) contain the source paths
and actual local evidence. These rows are new implementation work and do not
attribute earlier teammate work to this account. No new ChatGPT/Gemini/AI Studio
midterm experiment or student manual test is invented. Hosted migration/Auth,
required model checkpoints, review and student defense remain separate evidence.


## Midterm post-publication provider critique

The actual matching ChatGPT/Gemini prompts, rendered outputs, accepted/rejected findings and verification chronology are recorded in the [personal journal](mfalujo23/midterm-ai-log.md#post-publication-model-review). These reviews postdate f4ea7ab and are not credited as producing that earlier code. The next release/security changes are separate local follow-up work until their actual publication.


## Release and security follow-up

The [personal release journal](mfalujo23/release-ai-log.md) records local coding assistance, actual browser findings, accepted/rejected changes and verification boundaries. Source-gate logs do not stand in for hosted database/Auth, human UAT, carrier calls, final deployment or rollback evidence. The consolidated matching provider review is one experiment per tool, with later actual captures recorded separately.


## 2026-11-18 - mfalujo23 Lab 1 remediation and matching model critique

Lab 1 implementation and matching model-review evidence are recorded below.

See the [personal Lab 1 AI journal](mfalujo23/lab1-ai-log.md) for the exact
matching prompt, two observed ChatGPT/Gemini differences, useful and rejected
output, verification, and implementation commit links. The
[provider captures](mfalujo23/ai-experiments/README.md) preserve the actual output.

| Tool | Prompt | Output used | Output rejected or qualified | Verification | Commit |
| --- | --- | --- | --- | --- | --- |
| Codex | Repair the inherited shell, setup, authorization initialization, and checks. | Purpose, three accessible cards, pinned tooling, lazy privileged client, strict CI. | Earlier team evidence was not credited to this account; fake credentials and tolerated failures were rejected. | Actual local responsive/Fast Refresh checks and successful hosted lint/types/33 Vitest + 5 webhook tests/build. | `fae1a1e`, `0790888`, `4fd8974`, `716883f`; full links in the personal journal. |
| ChatGPT website, Instant; exact version not exposed | App Shell Architect; same complete prompt as Gemini. | Plain-language stack explanation, src layout, inherited-history safety, and planned-voice honesty used to critique existing work. | Tablet-three-column example; no command-result or student-check claims accepted. | Captured completed rendered response compared with source/course requirements and actual 375/768/1280 evidence. | Critique of source `fae1a1e`; new docs tracked in PR 4, exact new SHA pending publication. |
| Gemini 4 Hydrogen, AI Studio, High thinking | Same App Shell Architect prompt; temporary chat. | Fresh/inherited workflow distinction, tool explanations, and proposed 1/2/3-column verification. | No-src-dir flag conflicts with the course; nested section/card headings require h3 cards; sample missing routes were not copied. | Actual Markdown capture compared with source/specification; no suggested generator commands executed. | Critique of source `fae1a1e`; new docs tracked in PR 4, exact new SHA pending publication. |

The model experiments followed the implementation and are documented as critique,
not retroactive generation history. AI Studio Drive access was not granted;
no persisted saved prompt title is claimed. Student understanding, personal
checks, required review or a documented instructor-approved solo alternative,
and any required AI Studio prompt persistence remain pending. No merge,
Canvas submission, or instructor credit is asserted by this record.


## Actual consolidated ChatGPT and Gemini source review

One matching experiment per tool covered Labs2,4,6,8–16. The [complete disposition and six-column journal](mfalujo23/consolidated-model-review.md) links exact prompts, actual outputs, independent reproductions, rejected/already-implemented findings and the later261-test gate. The original243-test source prompt and later251-test browser-fix checkpoint are preserved chronologically; no repeated per-lab runs or retroactive credit are invented.


## Michael Falujo (mfalujo23) - Lab 2 component alignment

| Date | Tool / model | Prompt | Output used | Output rejected | Verification | Git trace |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-19T21:50:51.840Z | Google AI Studio / Gemini 4 Hydrogen (gemini-4-hydrogen) | [Exact props-only prompt](mfalujo23/ai-experiments/lab2-props/lab2-props-prompt.txt) | Required Property, indexed ID/ZIP and optional/default/readonly prop semantics | Callback rename onFilterChange was not applied; existing onApply stays compatible | Actual raw declarations are preserved; separate imported compiler harness checks the accepted contracts. Gemini did not execute tests. | Base 3e48dad16d9df3aa07630c90f0858f511e6c237c; Lab 2 candidate, not yet published |
| 2026-11-19 | Codex / exact identifier not captured | Align the actual components with Canvas using shared canonical types, a facts list, Tailwind grid and a business-named local sponsor link | Shared type aliases/props, native facts list and safe local Imaginary Garden Shop page | No duplicate data schemas/casts, whole-card restyling, invented marketing facts, human reviews or student-executed test claims | Assistant-run focused component/schema tests, lint and TypeScript checks are recorded in the separate verification receipt; full combined gate remains pending | Same isolated candidate; related PR 5 and integration PR 14 |

[Raw response](mfalujo23/ai-experiments/lab2-props/lab2-props-response.ts.txt), [capture metadata](mfalujo23/ai-experiments/lab2-props/lab2-props-observation.json) and [screenshot](mfalujo23/ai-experiments/lab2-props/lab2-props-studio.jpg). The run was temporary, with no selected API key or code execution; structured output was off for the requested TypeScript interfaces.

[Component/type verification](mfalujo23/evidence/lab2-alignment/verification.json), [actual focused output](mfalujo23/evidence/lab2-alignment/focused-tests.txt).


## Public listings read view - November 19, 2026

| Tool/date | Prompt | Decision | Verification | Trace |
| --- | --- | --- | --- | --- |
| Codex; model version not exposed; November 19, 2026 | Add a separate listings view reading the existing public route. Preserve the five Gemini fixtures and existing tasks. Validate the actual 15-field response; provide loading, empty, error and retry states. No new credentials or database writes. | Used one client-safe public response contract, strict collection validation, bounded GET and accessible state messages. Rejected casting the distinct Gemini property shape, silently using fixtures after failure, exposing raw errors or adding inquiry tables without a defined contract. | 20 focused tests, scoped lint and full types passed. Schema keys match the retained public-route observation. Checks used mocked responses; Later full-gate and rendered local checks are recorded below. No new provider experiment was performed. | Input source 3e48dad16d9df3aa07630c90f0858f511e6c237c; new follow-up is in this candidate. Existing integration PR: https://github.com/mfalujo23/neighborhood-listing-platform/pull/14 |

Combined verification on November 19, 2026: `node scripts/verify-release.mjs` passed 401 unit tests across 33 files, 21 webhook tests, all ten local phases, lint, types, production build and the fictional loopback capacity check. The normal build kept the local accessibility control off and used no provider credentials. This full gate preceded the one-declaration CSS reflow correction.

The later reflow correction removed only `body` min-width:320px. Existing listing/booking UI tests (62 across six files), lint, types, normal build and separate local QA build passed. [Actual local browser checks](mfalujo23/evidence/listings-browser-review.json) then verified keyboard controls, the real approved-data read, controlled error/retry without fixture fallback, 320/375/768/1280 reflow and three passing axe audits. These were read-only checks, not human usability sessions or a hosted-page test. Assigned-partner review remains pending. No additional provider-model experiment was performed.


## Michael Falujo (mfalujo23) - Property detail page

| Date | Tool / model | Prompt | Output used | Output rejected | Verification | Git trace |
| --- | --- | --- | --- | --- | --- | --- |
| November 19, 2026 (America/Los_Angeles) | Codex; exact model identifier not exposed | Add the required /listings/[propertyId] page using the existing five validated Gemini fixtures. Preserve Save and native details, reject unknown IDs and add a named card link. No schema/SQL/provider writes. | Awaited Next 16 params, shared runtime validation, fixed internal links, pre-rendered known IDs, escaped text and generic unavailable page | Duplicate fixtures/schemas, raw HTML, invented sponsor destinations, public audit controls and unperformed browser/provider claims | Assistant-run 417 unit tests, 21 webhook tests, strict lint/types, normal production build and 9 actual loopback HTTP checks passed. Normal audit control off. [Results](mfalujo23/evidence/property-detail/verification.json), [HTTP](mfalujo23/evidence/property-detail/http-results.json), [actual output](mfalujo23/evidence/property-detail/test-build-output.txt). Rendered browser checks are separate. | Base 96c078949cef9b91ea13980da1dd26cf4b34ea5f; isolated candidate related to [PR 14](https://github.com/mfalujo23/neighborhood-listing-platform/pull/14). No new commit, review, merge, deployment or live defense is claimed. |


## Discovery and analytics evidence follow-up

The required discovery review used the existing team questions and de-identified notes in ChatGPT and Google AI Studio. The selected questions, source-by-source theme check, accepted and rejected suggestions, prompt and unchanged outputs are recorded in [the Lab 4 process log](mfalujo23/lab4-followup-ai-log.md).

The required analytics comparison used the same fictional fixture with both tools. The calculations were checked against the saved local results. The chosen inquiry-flow count chart is a next design to evaluate; the current required daily chart remains unchanged. See [the comparison](mfalujo23/lab14-model-comparison.md) and [process log](mfalujo23/lab13-14-ai-log.md).

The browser runs were performed by an assistant under Michael Falujo's direction. Their capture records identify November 19, 2026, Pacific time. This commit adds and corrects documentation only. It does not claim new application tests, participant sessions, stakeholder approvals or other students' work.


## Listing search and sponsor explanation - November 23, 2026

| Tool | Prompt | Used | Rejected | Verification |
| --- | --- | --- | --- | --- |
| AI coding assistant; exact model identifier not exposed | Use classmate feedback to add address/city/ZIP search and clarify the sample gardening sponsor. Keep the existing data and filters. | Labeled search over existing fields, combined filters and reset, responsive layout, and clear missing-information text. | Invented neighborhood fields, services or hours; treating a tool's inability to operate controls as an application failure; claiming incomplete human tests passed. | Assistant-run lint, types, 421 unit/component tests, 21 webhook tests, local database checks and production build passed. [Source-check receipt](mfalujo23/evidence/listing-search/verification.json). |

This change uses partial written-content feedback, not a completed participant session. The local production build also passed in-app browser checks for search, combined filters, empty/reset states, keyboard focus, sponsor navigation and reflow at 320, 375, 768 and 1280 pixels. Hosted verification remains separate and pending. The earlier partner approval applies to its reviewed source, not this new search change. Base: `1de4e52545b0dfc5be877569e78140a50f7cd70a`; related [PR 14](https://github.com/mfalujo23/neighborhood-listing-platform/pull/14).
