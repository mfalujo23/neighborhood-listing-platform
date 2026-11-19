# Application architecture and scaffolding

## Original problem
The inherited shell used an obsolete next lint command and eagerly constructed a privileged Supabase client while Next.js imported routes, so a credential-free build failed. The public purpose and three feature cards also needed a usable semantic shell.

## Initial prompt
Summary recorded, not a retained exact provider prompt
Inspect the existing project against Lab 1 shell, Git, AI logging and deployment requirements; preserve teammate history and obtain genuine checks.
- [Original source](../../docs/mfalujo23/lab1-ai-log.md).

## AI response summary
Codex prepared the accessible public shell, pinned compatible tooling, ESLint flat configuration, Tailwind PostCSS support and a server-only request-time administrator-client getter. No separate ChatGPT/Gemini/App Shell Architect run is established by this checkpoint.

## Recorded technical critique
A build must not require fake production credentials or weaker authorization. next lint is unavailable in Next.js 16; the installed parser rejected TypeScript 7. A local worker failure was preserved rather than relabeled as a pass.

## Revised prompt / actual revision status
Only follow-up task summaries were retained
Move privileged-client creation to request time while preserving caller identity and role checks; use the supported explicit lint/build tools.

## Final result
Published Lab 1 code builds the public shell without provider secrets and preserves authorization checks for administrator routes. The actual later development experiment changed one heading without browser reload and restored a clean checkout.

## Verification evidence
- Actual baseline lint/build failures and corrected isolated checks in docs/mfalujo23/lab1-evidence
- Real local public HTTP 200 and unauthenticated administrator rejection
- Audit 1 fresh Fast Refresh probes plus Git/CI/deployment/curl evidence; these checks were performed by the assisting agents, not represented as Michael's personal tests

## Related GitHub work
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/pull/4)
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/commit/d0db83a2b7886f2a1a543529d2f11770adbfcfe3)

## Michael’s critique and lesson — student entry required
Michael must state which decision he accepts, explain the server/client trust boundary and write his own lesson. Do not invent an earlier model comparison, exact prompt or personal verification.

The technical critique above is a recorded assisting-agent analysis. Michael must state his own assessment and the verification he personally performed; no student experience or retrospective checkpoint is fabricated.
