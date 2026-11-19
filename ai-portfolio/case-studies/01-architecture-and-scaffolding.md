# Application architecture and scaffolding

## Original problem
The inherited shell used an obsolete next lint command and eagerly constructed a privileged Supabase client while Next.js imported routes, so a credential-free build failed. The public purpose and three feature cards also needed a usable semantic shell.

## Initial prompt
The implementation task was retained as a summary. A later matching ChatGPT/Gemini review used the [exact App Shell Architect prompt](../../docs/mfalujo23/ai-experiments/app-shell-prompt.txt). The actual [ChatGPT capture](../../docs/mfalujo23/ai-experiments/chatgpt-app-shell.json) and [Gemini capture](../../docs/mfalujo23/ai-experiments/gemini-app-shell.json) reviewed already-implemented work.
- [Original source](../../docs/mfalujo23/lab1-ai-log.md).

## AI response summary
The AI coding assistant prepared the accessible public shell, pinned compatible tooling, ESLint flat configuration, Tailwind PostCSS support and a server-only request-time administrator-client getter. That implementation checkpoint predates the separate matching App Shell review now recorded in the linked log.

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

## My decision and lesson

I would keep the inherited src-based Next.js structure and make bounded changes instead of rerunning a project generator over team work. The actual ChatGPT App Shell response was more useful for the required src directory, but its tablet-three-column example still needed correction. Gemini supplied useful verification steps; its no-src-dir command did not fit the course.

I would retain lazy, server-only privileged-client creation. A public build should not require fabricated credentials or weaker authorization. My lesson is to check version-specific commands and the actual trust boundary before accepting a polished setup plan. The recorded build/browser checks were executed by the assistant; my role was directing and approving the catch-up work.
