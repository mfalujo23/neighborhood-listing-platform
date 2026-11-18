# Lab 1 verification - mfalujo23

Date: 2026-11-18. Local branch: `setup/mfalujo23-lab1-remediation`.
Base commit: `c36ccf8`.

These are actual Codex-executed checks and Codex browser observations. They are
not represented as student-performed manual verification, partner reviews, or a
complete hosted deployment. Lab 1 still needs the outstanding evidence below.

## Environment and reproducibility

- Node.js: `v24.22.3`.
- Final npm: `11.21.3`, downloaded from the official registry into task-local scratch
  tools; the system's `npm` command was not on PATH.
- Git: `2.56.0.windows.2`.
- Exact direct dependency versions and transitive lockfile are recorded as
  source files; no global tool installation was performed.
- A separate clean `npm ci --ignore-scripts` installation completed successfully:
  437 packages added, 444 audited, zero reported vulnerabilities, exit code 0.
  The final clean installation used npm 11.21.3 in the isolated publication
  snapshot. Earlier npm 12.2.3 experiments are retained as baseline evidence.
  npm printed a deprecation notice for ESLint 9.39.4, which is pinned for the
  installed Next.js lint configuration's compatible ecosystem.

Actual npm invocations in this workspace used:

```text
node ../lab1-tools11/node_modules/npm/bin/npm-cli.js <npm arguments>
```

That invokes the official npm CLI; a workstation with npm on PATH can use the
ordinary `npm` commands shown in the README. Package install scripts were
disabled during both the original dependency install and the clean check.

## Baseline findings and corrections

| Check before tooling remediation | Actual result | Correction |
| --- | --- | --- |
| Existing `npm run lint` (`next lint`) | Exit 1: Next treated `lint` as a nonexistent project directory. | Explicit ESLint CLI and Next.js flat configuration. |
| Existing `npm run build` | Compiled and typechecked, then failed on eager Supabase administrator-client construction: `supabaseUrl is required`. | Request-time, server-only administrator client; existing caller authorization checks retained. |
| Existing `npm test` | 33 Vitest tests passed; Node webhook process failed parsing the empty fixture. | Reported as a separate Lab 9 defect, not concealed by changing the test command. |
| TypeScript 7 with the installed lint parser | Parser explicitly rejected the TypeScript 7 API. | Pinned TypeScript 6.0.2. |
| Turbopack after enabling PostCSS | Local worker exited before connection; build failed. | Supported Next.js Webpack mode used for `dev` and `build`. |

The pinned configuration does not ignore build/type errors or remove tests to
obtain a pass. The inherited error-tolerant CI workflow is corrected separately
in `ci-verification.md`; a real GitHub-hosted result remains pending publication.

## Local page and development-server evidence

The credential-free development server started on `http://127.0.0.1:3000` with
the actual terminal message `Ready in 494ms`. A real local request returned HTTP
200 with a server timestamp, the BarrioList heading, and all three feature
headings. No external service was needed to render this page.

While that same process and browser tab remained open, Codex changed one section
heading from `Built around your neighborhood` to `Explore your neighborhood`.
The browser independently displayed the new heading without a reload. A second
HTTP response returned 200, included the new heading, and omitted the old one.
The terminal's request/rebuild timings are retained in the development log.

The browser verified the following rendered grids and found no horizontal
overflow:

| Viewport width | Actual feature-grid columns |
| --- | --- |
| 375 px | One column, 311 px |
| 768 px | Two columns, 340 px each |
| 1280 px | Three columns, approximately 362.66 px each |

All three cards and the project purpose were visible. Voice help is accurately
described as planned. Screenshots are retained with the task outputs as
`Lab-1-mobile.jpg` and `Lab-1-desktop.jpg`; they are browser evidence, not a
Lighthouse compliance score or a claim that all later project features work.

## Authorization and repository hygiene checks

With no external credentials supplied, real local requests returned:

```text
GET /api/admin/bookings -> 401 {"error":"Sign-in is required."}
PATCH /api/admin/services -> 401 {"error":"Sign-in is required."}
```

These verify rejection of unauthenticated requests. Real signed-in administrator
or non-administrator database access was not exercised.

`git check-ignore --no-index` matched `.env`, `.env.local`, `.env.production`,
`node_modules`, `.next`, and local webhook records, while the `.env.example`
exception remained allowed. `git ls-files` found only `.env.example` among the
environment-file patterns. This is a tracked-file hygiene check, not a complete
repository-wide credential certification.

## Final command results

The publication snapshot was independently constructed from base `c36ccf8` plus
the Lab 1 file group, the strict CI correction, and three minimal baseline
repairs: the synthetic webhook fixture, `PropertyCard`'s index signature changed
from `any` to `unknown`, and an unused Twilio catch binding removed. It excludes
the concurrently prepared newer Lab 2/3 and voice implementations. These checks
therefore verify this exact Lab 1 snapshot rather than relying on a different
combined source tree.

| Final isolated command (npm 11.21.3) | Actual result |
| --- | --- |
| `npm ci --ignore-scripts` | Exit 0; 437 packages added, 444 audited, zero reported vulnerabilities. |
| `npm run lint -- --max-warnings 0` | Exit 0, no errors or warnings. |
| `npm run typecheck` | Exit 0. |
| `npm test` | Exit 0: 33 Vitest tests and 5 original webhook tests passed. Only fictional webhook data was used. |
| `npm run build` | Exit 0: compilation, TypeScript, page-data collection, static generation, optimization, and build traces completed. No external credentials were supplied. |

The build retained the baseline `/` route and eight API routes. It printed missing
Upstash configuration warnings from the existing Twilio route; those external
integrations were not exercised or certified. The original Node webhook test
also printed its existing package-module-type warning. Neither warning was
hidden or substituted with fake service credentials.

Next.js 16's terminal build summary did not list bundle sizes. A separate actual
filesystem measurement records generated JavaScript and CSS asset names and
byte sizes in `isolated-generated-asset-sizes.txt`. These are artifact sizes,
not invented per-route first-load network totals.

## Raw evidence

See the adjacent `lab1-evidence/` directory for exact environment, clean-install,
baseline command, development-server, HTTP, authorization, and ignore-check
output. No command output or deployment result was fabricated.

## Outstanding before a complete Lab 1 submission

- Student review and explanation of the code and verification evidence.
- Genuine ChatGPT/Gemini stack comparison and Google AI Studio checkpoint, where
  still required by the instructor. This remediation did not perform them.
- New attributable commit references, issue, pull request, review or documented
  instructor-approved solo alternative, and actual automated check results.
- A deployment of the submitted commit, its hosting-dashboard commit SHA, and
  actual live response evidence. The historical team deployment is not proof of
  this branch's deployment.
- Instructor repository access, if not already granted, and the user's reported
  solo-work exception applied to the remaining collaboration requirements.
