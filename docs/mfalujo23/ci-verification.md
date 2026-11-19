# CI correction and verification

Date: 2026-11-18. Prepared with Codex assistance for `mfalujo23`.

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
verification records. A GitHub-hosted check run, its URL, and its exact checked
commit remain pending publication; local success is not represented as a hosted
CI run or a deployment.

The workflow YAML was parsed locally, confirming `push` and `pull_request`
triggers, one verification job, `contents: read`, the six expected install/check
commands, and the absence of `continue-on-error` or `|| true`. The isolated Lab 1
snapshot passed its strict lint, typecheck, tests, and build with the same npm
11.21.3 CLI. GitHub-hosted execution has not yet been observed.

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
  No hosting setup or deployment has been claimed here.

Sources consulted:

- https://github.com/actions/checkout
- https://github.com/actions/setup-node
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/package-managers
