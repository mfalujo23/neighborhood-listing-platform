# BarrioList - Neighborhood Listing Platform

BarrioList is a course project for exploring neighborhood property listings,
clearly identified local sponsors, and voice assistance. The home page is the
Lab 1 app shell: a project introduction and three responsive feature cards.
The repository also contains later work on services, bookings, sponsor matching,
Supabase authorization, media, and telephony. Their presence is not a claim that
every integration is configured or verified.

## Local setup

Use Node.js 24 and npm 11.21.3. Direct dependencies are pinned in `package.json`;
`package-lock.json` records the complete resolved dependency tree.

```sh
git clone --branch setup/mfalujo23-lab1-remediation https://github.com/mfalujo23/neighborhood-listing-platform.git
cd neighborhood-listing-platform
node --version
npm --version
git --version
npm ci --ignore-scripts
npm run dev
```

Open `http://localhost:3000`. The home page does not require account credentials
or external services. Dependency install scripts are disabled by the documented
installation command; the optional Supabase CLI is not needed to view the shell.
Development and production builds use Next.js's supported Webpack mode because
the local Windows verification encountered a Turbopack PostCSS worker failure.

```sh
npm run lint -- --max-warnings 0
npm run typecheck
npm test
npm run build
npm start
```

`lint` invokes ESLint directly with the Next.js and TypeScript configurations.
Next.js 16 does not provide `next lint`. Lint and tests must be run separately
from the production build. The verification notes record actual command results
and any unresolved failures; do not infer them from an existing CI badge.

## Configuration and data

Database and telephony routes need their own server environment configuration.
The Supabase administrator client is created only when a server request needs it;
building the public app shell does not require a service-role key. Existing
administrator routes still verify the caller's identity and administrator role
before using the privileged client.

Keep actual values in an untracked local environment file or in the hosting
provider's environment settings. `.gitignore` excludes `.env*`, except the safe
`.env.example` template. Never commit secrets, caller data, or local webhook
event records. No production credentials were supplied or used for this Lab 1
remediation.

## Main files

- `src/app/page.tsx`: the accessible Lab 1 home page.
- `src/app/layout.tsx`: document language, metadata, and global styles.
- `global.css` and `postcss.config.mjs`: shared styles and Tailwind CSS setup.
- `src/components/`: existing listing, sponsor, search, and service components.
- `src/app/api/`: existing API routes; external configuration is required where used.
- `supabase/migrations/`: versioned database schema and policy changes.
- `docs/`: the team's existing design, test, and AI-assistance records.
- `docs/mfalujo23/`: distinct records for this account's current remediation.

## Lab 1 contribution and evidence

This remediation was prepared with Codex assistance for the `mfalujo23` account.
The personal AI log distinguishes automated checks from student review and lists
unfinished assignment requirements. It does not attribute earlier teammates'
implementation, tests, or reviews to this account.

- [AI-assistance log](docs/mfalujo23/lab1-ai-log.md)
- [Verification notes](docs/mfalujo23/lab1-verification.md)
- [Existing team AI log](docs/ai-log.md)
- [Matching ChatGPT/Gemini experiment captures](docs/mfalujo23/ai-experiments/README.md)
- [Issue 1](https://github.com/mfalujo23/neighborhood-listing-platform/issues/1)
- [Lab 1 PR 4](https://github.com/mfalujo23/neighborhood-listing-platform/pull/4)
- [Successful GitHub Actions run](https://github.com/mfalujo23/neighborhood-listing-platform/actions/runs/44420717814)

Four new attributable implementation commits are recorded in the personal log:
app shell, reproducible tooling/hygiene, deferred privileged clients, and strict
CI. PR 4 remains open; student understanding and the required review or
instructor-approved solo alternative still need evidence. The instructor
`pdt605` invitation is pending acceptance.

The successful hosted workflow checked the PR merge ref for head `d0db83a`
against base `c36ccf8`: strict lint, TypeScript, 33 Vitest tests, 5 webhook tests,
and production build passed. These counts describe that Lab 1 revision; later
branches have separate verification records.

The original repository has historical pull requests, including
[PR 1](https://github.com/gavy1997/neighborhood-listing-platform/pull/1) and
[PR 2](https://github.com/gavy1997/neighborhood-listing-platform/pull/2).
Those links are historical evidence, not a new review of this remediation.

## Hosting

- [Immutable verified Lab 1 deployment](https://neighborhood-listing-platform-3deuqbofy-mfalujo23.vercel.app/)
- [Production alias at observation](https://neighborhood-listing-platform-sable.vercel.app/)
- [Deployment source commit 716883f](https://github.com/mfalujo23/neighborhood-listing-platform/commit/716883ff822152390d0329d5e5602290d3688e5e)
- [Hosting verification and raw evidence](docs/mfalujo23/lab1-deployment-verification.md)

On 2026-11-18, Codex verified the deployed source in Vercel and the rendered
public page. Actual HTTPS checks returned 200 for the homepage and 401 for an
unauthenticated administrator-bookings request. The immutable URL identifies
the verified source deployment; the production alias can change. Documentation
follow-ups are separate commits and are not described as newly deployed without
checking their hosting record.

The team's earlier `neighborhood-listing-platform-lime.vercel.app` URL is
historical and is not used as proof of this account's deployment. The verified
Lab 1 shell does not establish that configured database, phone, SMS, or other
later integrations work.

## Existing Lab 7 content process

The repository's existing media documentation describes a process in which the
governance lead revokes unapproved copy, the app uses verified fallback content,
and the team records the corrective action in `docs/AI_COLLABORATION_LOG.md`.
See `docs/APPROVAL_WORKFLOW.md` and `docs/ASSET_INVENTORY.md` for the team records.
This Lab 1 remediation does not re-certify that later pipeline or its metrics.
