# Lab 2 remediation prepared for mfalujo23

Date: November 18, 2026. Codex assisted with this local remediation. These are new changes, not claims that Michael authored the earlier team submission or performed a historical peer review.

## Result

`/listings` now mounts five explicitly synthetic property cards. The existing async database-backed `SponsorBanner` is unchanged. The demonstration uses a separate visible `Sponsored · Synthetic example` placement without database writes, tracking, paid claims, or an external sponsor link.

- `PropertyCard` uses an `article` labeled by its `h3`, a dynamic factual alt description for the schematic illustration, a real favorite toggle with `aria-pressed`, and native expandable details.
- `SearchFilters` has an explicitly named form, visible labels associated with native selects, Apply and Reset buttons, and callbacks that change the displayed results. The result count is announced through a polite status region.
- The page has one `h1`; filters, sponsor disclosure, and listing results have `h2` headings; card titles use `h3` within the listing results.
- CSS Modules define one column below 640px, two columns from 640px, and three from 1024px. Focus-visible outlines are 3px with a 3px offset. Buttons and native summary controls have at least 44px minimum height.
- The SVG is a local Codex-authored schematic illustration. It is not a photograph of any listed property. All records, addresses, cities, and sponsor names are invented classroom data.

## Current verification and limits

The focused property-contract suite passed 13 tests locally. Scoped ESLint and the full TypeScript typecheck exited successfully. Actual raw payload validation is recorded separately under `evidence/`. The root browser first found an incorrect relative fixture-import path; it was corrected before the passing checks. The root agent subsequently performed the keyboard trace, favorite/details activation, filter/reset behavior, and 375/768/1280px responsive checks successfully. Its exact observations and copied screenshots are recorded in `lab2-audit-evidence.md` with observer provenance.

A separate stacked source snapshot was constructed from the verified Lab 1 snapshot plus this exact Lab 2/3 file group. The published Lab 1 base head is `716883ff822152390d0329d5e5602290d3688e5e` (PR https://github.com/mfalujo23/neighborhood-listing-platform/pull/4). With Node 24.22.3 and npm 11.21.3, its clean dependency install, strict lint with zero warnings, full typecheck, all 43 Vitest tests (including the 13 property tests), all 5 inherited Node webhook tests, and production build passed. The final build includes `/listings` as a prerendered static route.

Default-sandbox builds first failed on local filesystem EPERM mkdir operations. Those failures are preserved; the successful isolated build used approved execution outside the sandbox after clearing only its verified generated `.next` directory. No source workaround was applied. The inherited Upstash route emitted missing-configuration warnings; a build pass does not establish that external telephony/Redis services are configured. Exact logs are `evidence/lab23-isolated-*.log` and `lab23-clean-install.log`.

Favorites are an in-memory demonstration, not a persistent account feature. No Supabase, Gemini, Twilio, Vapi, stakeholder outreach, deployment, or third-party review was performed by this remediation agent. The instructor's solo-work exception was reported by the user; no peer activity is fabricated.

## Evidence map

- Exact component, handler, alt, and styling snippets: `lab2-audit-evidence.md`.
- Rendering boundary and fixture contract: `lab3-contract-and-validation.md`.
- AI assistance and student verification status: `ai-log.md`.

Student follow-through still required: inspect and understand these changes, record personal decisions and actual checks, follow the instructor's applicable review arrangement, and defend the work. This preparation is not a grading guarantee.
