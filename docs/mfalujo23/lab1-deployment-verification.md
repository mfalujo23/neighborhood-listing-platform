# Lab 1 publication and deployment verification

Observed by Codex on 2026-11-18. These are actual tool/browser observations, not student-performed checks or proof of instructor credit.

- Repository: https://github.com/mfalujo23/neighborhood-listing-platform
- Issue: https://github.com/mfalujo23/neighborhood-listing-platform/issues/1
- PR: https://github.com/mfalujo23/neighborhood-listing-platform/pull/4
- Tested/deployed source head: `716883ff822152390d0329d5e5602290d3688e5e`
- Production branch: `setup/mfalujo23-lab1-remediation`
- Vercel dashboard: https://vercel.com/mfalujo23/neighborhood-listing-platform/Bihq83gTH3hcCgHnVFnWsTBTPjcW
- Immutable deployment: https://neighborhood-listing-platform-3deuqbofy-mfalujo23.vercel.app/
- Public production alias at observation: https://neighborhood-listing-platform-sable.vercel.app/

Vercel showed Ready, Production, Current, source `716883f`, and a 41-second deployment. The build log explicitly cloned that branch/commit, compiled Next.js 16.4.6 with Webpack, completed the build, and completed deployment. The public browser rendered the BarrioList purpose and all three semantic feature cards. A separate real HTTPS probe returned 200 for `/` and 401 `{"error":"Sign-in is required."}` for `/api/admin/bookings`. This checks anonymous rejection only. No signed-in admin/database/provider operation was performed.

Warnings were retained: project settings defaulted to Node 26 but package engines correctly selected Node 24; npm reported unknown cache-dir configuration and the esbuild postinstall approval notice. Vercel package-manager exact version was not established by the displayed log, so the npm 11.21.3 claim applies to the independent local clean build only. The hosting log is not evidence that GitHub lint/tests ran.

The instructor pdt605 was invited with user-approved write access; the visible state is Pending Invite, awaiting acceptance. GitHub Actions was enabled on this fork after the original PR opened; hosted checks remain pending this follow-up. ChatGPT/Gemini/AI Studio checkpoints, student understanding, and peer review or an instructor-approved solo alternative are still unperformed/unverified.

The user explicitly approved a Vercel Hobby project, public deployment and later verified updates to this same project with no paid upgrades. No paid upgrade, database integration, environment secret, microphone, call or SMS was added.
