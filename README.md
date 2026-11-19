# Neighborhood Listing Platform

Property listings, services and booking requests, disclosed sponsors, and
fictional voice and analytics demonstrations.

- [Public demonstration](https://neighborhood-listing-platform-sable.vercel.app/)
- [Release checks and remaining work #18](https://github.com/mfalujo23/neighborhood-listing-platform/issues/18)
- [Integration PR](https://github.com/mfalujo23/neighborhood-listing-platform/pull/14)
- [Integration branch](https://github.com/mfalujo23/neighborhood-listing-platform/tree/feature/mfalujo23-coursework-integration)
- [Separate practical-exam PR](https://github.com/mfalujo23/neighborhood-listing-platform/pull/11)

The current work is on the integration branch. The default branch has not been
updated to it. The practical-exam PR remains open for review.

## Run locally

Use Node.js 24 and npm 11.21.3. Versions are pinned in the package files.

```sh
npm ci --ignore-scripts
npm run dev
```

Open http://localhost:3000. Public fixture pages work without account credentials.
For checks and a production build:

```sh
npm run verify:source
npm start
```

The source check runs lint, types, tests, local database checks, build and a
fictional local booking check. It uses no provider credentials and does not
deploy. Configure private values from [`.env.example`](.env.example) only when
using hosted features. Never commit actual values or disable authorization.

## Pages and evidence

- `/listings`: the five validated fictional Gemini records and existing filters.
- `/listings/live`: approved example listings with loading, empty, error and retry states.
- `/services`: approved services and private booking requests.
- `/media-demo`, `/sponsor-simulator`: disclosed fictional sponsor examples.
- `/voice-simulator`: text simulation; no carrier call or SMS is made.
- `/dashboard-demo`: optional fictional data in page memory.
- `/realtor-dashboard`: sign-in and authorized property scope required.

[Hosted results](docs/mfalujo23/hosted-evidence/index.json) record real Auth/RLS,
booking persistence, synthetic callback checks and application rollback/restore.
Earlier results retain their actual source commits. The full local check passed
401 unit tests and 21 webhook tests. After removing one minimum-width rule,
62 UI tests, lint, types and the normal and local QA builds passed.
[Local browser checks](docs/mfalujo23/evidence/listings-browser-review.json)
verified the new listing pages with read-only hosted data. Hosted deployment
checks for these pages and assigned-partner review remain pending.

## Documentation

- [Architecture](docs/architecture.md) and [decisions](docs/architecture-decisions/README.md)
- [Data dictionary](docs/data-dictionary.md) and [migration order](migrations/README.md)
- [Privacy](docs/privacy-impact-note.md), [security](docs/security-audit.md) and [accessibility](docs/accessibility-audit.md)
- [Usability report status](docs/uat-report.md)
- [Voice](docs/voice-runbook.md) and [operations](docs/operations-runbook.md)
- [AI process journal](docs/ai-log.md) and [portfolio](ai-portfolio/README.md)

Human usability sessions, screen-reader checks, automatic traffic rollback and
hosted backup recovery remain incomplete. Application rollback was observed;
database recovery/RPO/RTO and live rotation continuity were not tested.
No release tag is claimed by these checks.
