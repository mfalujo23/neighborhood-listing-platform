# Lab 1 AI-assistance log - mfalujo23

Date: 2026-11-18. Account: `mfalujo23`.

Scope: Lab 1 remediation and matching model review. Personal understanding and required reviews remain separate from the verification recorded below.

## Actual matching model experiment

The same [complete App Shell Architect prompt](ai-experiments/app-shell-prompt.txt)
was sent to ChatGPT and Gemini on 2026-11-18. It asked for a plain-language stack
explanation, file plan, commands, accessibility requirements, and verification
checklist, with fictional examples, no secrets, no invented results, and a clear
distinction between a new project and an inherited repository.

- ChatGPT website: visible model label **Instant**. The selector did not expose
  an exact model version. The [capture](ai-experiments/chatgpt-app-shell.json)
  contains completed, visible rendered response text, not a Markdown export.
- Google AI Studio: **Gemini 4 Hydrogen (`gemini-4-hydrogen`)**, thinking
  **High**. Grounding, code execution, function calling, and structured output
  were disabled. The [capture](ai-experiments/gemini-app-shell.json) retains the
  actual copied response Markdown and observed settings.

Both responses are proposed teaching plans. Their sample commands were not
executed merely because the models suggested them. They were obtained after the
implementation commits below and serve as a documented critique of that work.

## Two concrete differences and decisions

| Difference in actual output | Evaluation and decision | Actual verification |
| --- | --- | --- |
| ChatGPT's fresh-project plan selects a `src/` directory. Gemini's fresh-project command uses `--no-src-dir` and puts `app/`, `components/`, and `data/` at the root. | Retain this repository's `src/app` structure, matching the course's explicit `src` requirement. Reject Gemini's fresh-project flag for this assignment. Both recommend inspecting an inherited repository instead of overwriting it; that guidance agrees with preserving team history. | Compared the course specification with `src/app/page.tsx`, `src/app/layout.tsx`, and the existing Git history. No project generator was rerun. |
| ChatGPT's sample grid uses `md:grid-cols-3`; Gemini proposes `sm:grid-cols-2 lg:grid-cols-3` and asks for a 1/2/3-column viewport check. | Keep the existing `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`: one column on mobile, two on tablet, three on desktop. Reject copying ChatGPT's tablet-three-column example. Gemini's small-breakpoint threshold is also not copied blindly. | Actual Codex browser measurements at 375/768/1280 px showed 1/2/3 columns, with no horizontal overflow. These earlier implementation checks are recorded in [verification notes](lab1-verification.md). |

Both illustrate card titles as `h2`. Gemini's complete example also supplies a
section `h2`, although its prose acknowledges that card headings may then need
`h3`. The current page uses `h1` for the project, `h2` for the feature section,
and `h3` for each card. Retain that hierarchy. Both recommend honest planned
voice status and no fake working microphone control; the current shell already
labels voice assistance as planned.

## Tool, use/reject, verification, and commit journal

| Tool | Prompt/request | Output used | Output rejected or qualified | Verification | Associated commit |
| --- | --- | --- | --- | --- | --- |
| Codex | Inspect and repair the inherited Lab 1 shell without taking teammates' credit. | Project purpose, three semantic feature cards, responsive layout. | Existing team claims were not treated as fresh evidence or this account's contribution. | Rendered page, HTTP 200, 375/768/1280 layouts, and observed Fast Refresh. | [fae1a1e](https://github.com/mfalujo23/neighborhood-listing-platform/commit/fae1a1e83ceb7f94743b94cce43e62f0517473f1) |
| Codex | Restore reproducible lint/build and protect environment files. | Pinned Node/npm ecosystem, ESLint CLI, Tailwind PostCSS, Webpack, safe ignore/template rules. | Obsolete `next lint`; incompatible TypeScript 7 parser API; locally failing Turbopack PostCSS worker. | Clean npm 11.21.3 installation, strict lint, typecheck, tests, build, and ignore checks; raw logs retained. | [0790888](https://github.com/mfalujo23/neighborhood-listing-platform/commit/07908884a72d733e5bda30c3fbff582923a55c63) |
| Codex | Allow a credential-free public-shell build while retaining privileged-route guards. | Server-only lazy administrator-client construction and truthful evidence records. | Fake credentials or skipped authorization were not used. | Production build; unauthenticated admin requests returned 401. No signed-in database verification is inferred. | [4fd8974](https://github.com/mfalujo23/neighborhood-listing-platform/commit/4fd89747427aa6679d57a437ba1fed3823662e7d) |
| Codex | Replace inherited tolerated CI errors with required checks. | Independent strict lint, TypeScript, test, and build steps; read-only workflow permissions. | `continue-on-error` and tolerated shell failures did not establish passing checks. | [Hosted run 44420717814](https://github.com/mfalujo23/neighborhood-listing-platform/actions/runs/44420717814) succeeded for PR head `d0db83a`, checking merge ref `9edd8e5`. | [716883f](https://github.com/mfalujo23/neighborhood-listing-platform/commit/716883ff822152390d0329d5e5602290d3688e5e) |
| ChatGPT website, Instant; exact version unavailable | Matching App Shell Architect prompt linked above. | Plain-language stack explanation, inherited-repository safety, `src/` layout, honest planned voice state, and explicit proposed-check language used to evaluate the existing shell. | Tablet-three-column sample is unsuitable for the chosen tablet layout. No command result or student-completed checklist was inferred. | Compared captured output with the course specification, actual source, and existing 1/2/3-column browser evidence. | Critiques source [fae1a1e](https://github.com/mfalujo23/neighborhood-listing-platform/commit/fae1a1e83ceb7f94743b94cce43e62f0517473f1); this docs-only follow-up is tracked in [PR 4](https://github.com/mfalujo23/neighborhood-listing-platform/pull/4), exact new SHA pending publication. |
| Gemini 4 Hydrogen, Google AI Studio, High thinking | Same matching prompt; temporary chat. | Separate fresh/inherited paths, explicit Node/npm roles, proposed 1/2/3-column checks, and planned-feature honesty used to critique the implementation. | `--no-src-dir` conflicts with the course; the nested heading example needs `h3` card headings. Sample `/sponsors` links were not added without an implemented route. | Compared the actual Markdown capture with the specification and source; no generator or provider command was run. | Critiques source [fae1a1e](https://github.com/mfalujo23/neighborhood-listing-platform/commit/fae1a1e83ceb7f94743b94cce43e62f0517473f1); this docs-only follow-up is tracked in [PR 4](https://github.com/mfalujo23/neighborhood-listing-platform/pull/4), exact new SHA pending publication. |

## AI Studio persistence boundary

The actual AI Studio prompt begins **App Shell Architect** and specifies the
required stack, accessible HTML, no secrets, commands, and a file plan. The run
was a temporary chat. Drive access was not granted, and no Drive-saved prompt
title or persisted reusable AI Studio prompt is claimed. The full prompt and
response are preserved in this repository. Persisting the titled prompt in AI
Studio remains pending if required by the instructor.

## Publication and remaining student evidence

- [Issue 1](https://github.com/mfalujo23/neighborhood-listing-platform/issues/1)
  and [PR 4](https://github.com/mfalujo23/neighborhood-listing-platform/pull/4)
  identify this account's work. The four linked implementation commits are
  attributable; the base is `c36ccf8`.
- [Hosting evidence](lab1-deployment-verification.md) identifies the actual
  deployed source `716883f`; this documentation follow-up is not assigned an
  invented deployment or commit SHA.
- The instructor `pdt605` invitation remains pending acceptance.
- Student understanding, student personal verification, required review or a
  documented instructor-approved solo alternative, and any required persisted
  AI Studio prompt remain pending. No partner activity, peer review, merge,
  Canvas submission, or instructor credit is claimed here.
