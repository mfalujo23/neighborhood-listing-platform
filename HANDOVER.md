# Michael Falujo - Operational Handoff

The tested application release is `ddfa417dd5f914992a882e3e28deeac06bfc79be`.
The public site is https://neighborhood-listing-platform-sable.vercel.app/.

## Install and configure

Use Node.js 24.22.3 and npm 11.21.3. The lockfile pins Next.js 16.4.6.

```powershell
git clone https://github.com/mfalujo23/neighborhood-listing-platform.git
Set-Location neighborhood-listing-platform
git checkout --detach ddfa417dd5f914992a882e3e28deeac06bfc79be
npm ci --ignore-scripts
npm run verify:source
```

Use [.env.example](.env.example) for configuration names. Keep values in an
ignored local file or the hosting environment. The Vapi callback needs its
dedicated server token and assistant ID. Follow-up remains unavailable.

For the database, follow the [guarded setup sequence](docs/mfalujo23/hosted-reproduction.md#setup-order)
and [SQL inventory](supabase/cloud/classroom/source-manifest.json). The original
seed and optional bundles have date, empty-table and schema guards. Do not
replay them against the existing populated project or bypass their guards.
The same guide lists the local fixture runners and recorded hosted checks.

## Check operation

```powershell
curl.exe --fail-with-body https://neighborhood-listing-platform-sable.vercel.app/api/health
npm test
```

The health response reports application liveness. It does not prove database
or voice-provider readiness. Use the managed database/API/Auth dashboards and
the [recorded role and callback checks](docs/mfalujo23/hosted-evidence/index.json)
for those separate boundaries. No separate webhook worker is deployed.

[GitHub run 45229586778](https://github.com/mfalujo23/neighborhood-listing-platform/actions/runs/45229586778)
passed 443 unit/component tests, 21 webhook tests, lint, types and build.
The local test runner also passed its database checks. Browser and hosted
results keep their own source versions; they are not participant sessions.
The public protected dashboard passed sign-in, date/property filters, safe
validation recovery and sign-out checks. Narrow-screen reflow is not verified.

## Recover, rotate and update

The [operations runbook](docs/mfalujo23/operations-runbook.md) contains the
database restore, staged secret rotation, dependency/model update and
retirement procedures. The [hosted guide](docs/mfalujo23/hosted-reproduction.md#recovery)
records the tested manual application rollback and restoration.

Application rollback is separate from database recovery. Managed backup
restoration, operational RPO/RTO, live rotation continuity and automatic
failed-smoke rollback remain unverified. The local restore result is a
disposable fixture test. No real phone call or SMS is claimed.

Before changing a model or dependency, use a branch, keep the previous release,
run the documented checks and compare known/unknown facts, invalid inputs,
consent refusal and failure recovery. Keep the exact model/prompt version.

## Retire the project

Follow the runbook's retirement sequence: stop writes and callbacks, inventory
resources, handle required retention, remove approved data and storage, revoke
credentials, release owned phone resources and verify that no paid resources
remain. Destructive provider actions require the resource owner's approval.
