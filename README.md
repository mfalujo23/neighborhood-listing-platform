# Neighborhood Listing Platform

## Integrated coursework verification

The current local integration provides listings/filtering, services and private booking requests, deterministic sponsor selection, fictional media/voice/dashboard demonstrations, protected analytics APIs, and local PostgreSQL role verification. Public demonstration routes clearly label fictional data and provider drafts. No live voice/model/SMS or production approval is implied.

Repository: https://github.com/mfalujo23/neighborhood-listing-platform

Node.js24.22.3 / npm11.21.3; all package versions and the lockfile are pinned. From a clean checkout without private environment files:

```powershell
npm ci --ignore-scripts
npm run verify:source
# Individual entry points:
npm run lint -- --max-warnings 0
npm run typecheck
npm test
npm run build
npm start -- --hostname 127.0.0.1 --port 3000
```

See [the sanitized configuration](.env.example), [operations/runbook](docs/mfalujo23/operations-runbook.md), [eight release gates](docs/mfalujo23/release-gate-audit.md), [security/accessibility checks](docs/mfalujo23/security-and-accessibility-audit.md), and [actual source-check results](docs/mfalujo23/release-evidence/source-gates.json). The source gate omits provider credentials, disables outbound features, runs actual disposable PostgreSQL checks, and stops on failure. It does not deploy or certify hosted readiness.

Routes: /, /listings, /services, /sponsor-simulator, /media-demo, /voice-simulator, /dashboard-demo; /realtor-dashboard and analytics source require verified authorization. /api/health reports liveness and marks database/voice as not_checked. Legacy /api/webhooks/twilio returns410; the signature-verified path is /api/webhooks/voice.

`npm run verify:release -- --commit <source-sha>` separately blocks release until all eight source-matched evidence records, including actual hosted smoke/rollback, exist. Hosted Supabase/Auth, final deployment/private-window smoke, full rendered accessibility, uncoached human usability work, operational restoration/token-continuity drills and student defense remain separate evidence. No v0.5.0 release is asserted.

The last independently captured early deployment was original Lab1 commit716883ff822152390d0329d5e5602290d3688e5e at https://neighborhood-listing-platform-3deuqbofy-mfalujo23.vercel.app/; that historical deployment is not evidence that this integrated candidate is hosted. Earlier setup/provenance notes below describe their original checkpoints.

---

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
git clone https://github.com/mfalujo23/neighborhood-listing-platform.git
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
npm run lint
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
The new AI log distinguishes automated checks from student review and lists
unfinished assignment requirements. It does not attribute earlier teammates'
implementation, tests, or reviews to this account.

- [AI-assistance log](docs/mfalujo23/lab1-ai-log.md)
- [Verification notes](docs/mfalujo23/lab1-verification.md)
- [Existing team AI log](docs/ai-log.md)

The original repository has historical pull requests, including
[PR 1](https://github.com/gavy1997/neighborhood-listing-platform/pull/1) and
[PR 2](https://github.com/gavy1997/neighborhood-listing-platform/pull/2).
Those links are historical evidence, not a new review of this remediation.

## Hosting

The team's previous README records
`https://neighborhood-listing-platform-lime.vercel.app/` as its deployment.
That deployment has not been linked to or revalidated for this local branch.
Before submitting Lab 1, record the deployment URL and deployed commit, verify
that it serves the submitted version, and attach the actual verification output.

## Existing Lab 7 content process

The repository's existing media documentation describes a process in which the
governance lead revokes unapproved copy, the app uses verified fallback content,
and the team records the corrective action in `docs/AI_COLLABORATION_LOG.md`.
See `docs/APPROVAL_WORKFLOW.md` and `docs/ASSET_INVENTORY.md` for the team records.
This Lab 1 remediation does not re-certify that later pipeline or its metrics.
