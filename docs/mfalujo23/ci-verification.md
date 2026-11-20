# CI correction and verification

Date: 2026-11-18.

The inherited `.github/workflows/deploy.yml` allowed type, test, and build errors
through `continue-on-error` and `|| true`. It therefore could not establish that
those checks passed. This fork replaces that workflow in place; no second legacy
job remains to display a misleading successful result.

The replacement is named **Project checks**. It runs Node.js 24, pins npm 11.21.3,
installs the checked-in lockfile with install scripts disabled, and executes
strict lint, TypeScript, tests, and the production build as separate steps. A
nonzero command exit fails the job. It uses read-only repository permissions,
does not persist Git checkout credentials, and contains no service credentials
or deployment command. The two official GitHub Actions are pinned to the exact
commits resolved from their `v7` release tags on this date.

Local command results are recorded with the relevant Lab 1, Lab 2/3, and Lab 9
verification records. The actual Lab 1 hosted result is recorded below; each
later branch requires its own result. CI success is not a hosting deployment.

The workflow YAML was parsed locally, confirming `push` and `pull_request`
triggers, one verification job, `contents: read`, the six expected install/check
commands, and the absence of `continue-on-error` or `|| true`. The isolated Lab 1
snapshot passed its strict lint, typecheck, tests, and build with the same npm
11.21.3 CLI.

## Actual GitHub-hosted Lab 1 result

On 2026-11-18, the GitHub connector returned completed/success for
[run 44420717814](https://github.com/mfalujo23/neighborhood-listing-platform/actions/runs/44420717814),
job 135212609727, with successful lint, TypeScript, test, and build steps.
The associated PR 4 head is `d0db83a2b7886f2a1a543529d2f11770adbfcfe3`.
The raw checkout log identifies the tested pull-request merge commit as
`9edd8e5e6a22e606a35fe9625d1b92ac28b55911`, merging that head into
`c36ccf8225edfa8ee6506dcdddf546d9a45609fe`. This is a workflow-generated test
merge; it does not mean the PR was merged.

The Ubuntu runner used Node 24.22.3, installed the pinned npm 11.21.3, added
444 packages, audited 451 packages, and reported zero vulnerabilities. The test
log records 33 Vitest tests and 5 original webhook tests passed. Strict lint,
standalone typechecking, and production build also passed. These Ubuntu install
counts differ from the local Windows snapshot and are recorded separately.

Raw evidence: [job/step results](ci-evidence/github-run-44420717814-jobs.json)
and [complete job log](ci-evidence/github-job-135212609727.log). Existing missing
Upstash and Node module-format warnings remain visible in the log. The result
predates this docs-only follow-up; the follow-up's CI must be checked separately
after publication.

## Hosting compatibility checked against official documentation

- Vercel lists Node.js **24.x** as available. Its platform selects and updates
  minor/patch releases, so the hosted exact version may differ from the local
  `24.22.3` executable.
- Vercel's package-manager support table currently lists npm **8-11**, and says
  npm is selected from the project's Node.js version rather than the lockfile.
  The final project configuration uses supported npm **11**, with **11.21.3**
  verified from the official registry and pinned for local checks and this CI
  workflow. Vercel's managed exact npm version must still be checked in a real
  deployment log. Earlier npm 12 local experiments are baseline evidence only.
  The actual Vercel deployment is recorded separately in
  [hosting verification](lab1-deployment-verification.md). The host log does not
  expose its exact managed npm version, so no hosted npm patch version is inferred.

Sources consulted:

- https://github.com/actions/checkout
- https://github.com/actions/setup-node
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/package-managers
