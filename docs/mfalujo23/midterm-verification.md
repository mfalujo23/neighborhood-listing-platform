# Midterm Implementation Verification

## Routes and components

- /services mounts ServiceCatalog, linked from the homepage.
- ServiceCard uses article, header/h2, specification ul/li and an explicitly
  named booking button.
- The catalog uses grid-cols-1 md:grid-cols-2 lg:grid-cols-3.
- Shared strict public-service and booking schemas protect rendering and writes.
- Keyboard DOM tests exercise Enter, Space, Tab and Shift+Tab, validation focus,
  cancel focus, asynchronous receipt focus, and visible-ring class declarations.
- src/lib/supabaseServer.ts is a server-only compatibility module actually used
  by the APIs. Ordinary writes use the public key/session, not an administrator key.

## Database execution

Fresh installation: review and apply the required exam migration, forward
repair 004, and exact-role constraint 007 in that order to a new isolated project.
Do not replay the historical remote-schema export that drops application tables.
Existing deployments use the forward repair files after reviewing their actual
state; the edited fresh-project migration is not a claim that history was
reapplied on a hosted database.

The [single fresh-project transaction](midterm-evidence/fresh-supabase-bootstrap.sql)
combines those exact source files and rejects any existing application tables
with 55000 FRESH_MIDTERM_PROJECT_REQUIRED. It contains no local Auth definitions;
it references the platform's managed Auth functions and roles. Its
[actual local execution check](midterm-evidence/fresh-bootstrap-check.json)
created all six backend tables, validated fresh profile CHECK constraints and
confirmed that replay is blocked. It has not been executed against a cloud project.

The automated local runner uses auth-bootstrap.sql only inside disposable
PGlite. That local auth.users/auth.uid stub must never be applied to Supabase.
The runner proves fresh five-table creation, exact role constraints, preservation
of legacy rows, idempotent forward repair and positive/negative RLS operations.

## Fictional local browser preview

This optional fixture transport uses actual disposable PostgreSQL and supports
only the public service read and booking insert needed for UI review. It is not
a general PostgREST implementation or a hosted authentication test.

Terminal 1, from the repository:

```sh
node scripts/midterm-local-preview.mjs
```

Terminal 2, PowerShell, from the same snapshot:

```powershell
$env:SUPABASE_URL='http://127.0.0.1:54325'
$env:SUPABASE_PUBLISHABLE_KEY='synthetic-midterm-public-key'
$env:MIDTERM_LOCAL_FIXTURE_PREVIEW='true'
npm run dev -- --hostname 127.0.0.1 --port 3002
```

Open http://127.0.0.1:3002/services. The page identifies its local fictional-data
mode. Use only fictional email/text, such as resident@example.test. Stopping
the fixture process discards all state. No real account or provider is contacted.
An older SUPABASE_ANON_KEY, if present in the terminal, takes precedence and
must be unset for this specific fixture preview.

The fixture transport was actually probed: approved service GET 200 with three
public records, fictional booking insert 201 with empty response, draft-service
booking 403/code42501, malformed email 400/code23514. These transport checks do
not establish the full Next/browser integration by themselves.

## Actual browser and Next integration checks

The [browser record](midterm-evidence/browser-qa.json) and
[Next request log](midterm-evidence/browser-server.txt) record the actual
fictional local /services integration on 2026-11-18:

| Viewport | Rendered grid columns | Horizontal overflow |
| --- | --- | --- |
| 375 px | One, 296 px | None; document scroll width 360 px. |
| 768 px | Two, 340 px each | None. |
| 1280 px | Three, approximately 362.66 px each | None. |

Enter and Space opened booking forms. Tab and Shift+Tab traversed the controls,
including the native date field's multiple segments. Cancel removed the form
and returned focus to its opening button with a visible outline/ring. Invalid
email and short notes produced the exact recorded alerts, associated error IDs,
and focus on the first invalid input.

A real Next POST returned 201, removed the form, and focused the receipt
paragraph. Stopping the local fixture transport produced 503 while retaining
the form and entered values. A restart inside the restricted sandbox remained
unreachable and produced another 503; after the fixture was properly restarted
outside it, retry returned 201 and focused the recovered receipt. This was
actual local failure/recovery, not a provider outage or hosted database test.

Screenshots saved with the task are Services-keyboard-preview.png and
Services-booking-confirmation.png. These browser observations are not represented
as student-performed testing, a screen-reader audit or full WCAG certification.
The preview processes were intentionally stopped before final source hashing.

## Final isolated checks

The exact publication snapshot starts from backend commit
5a51dcb601b372ea2ac4ab9147611743068f2ace and excludes unpublished sponsor,
analytics and media changes. Node 24.22.3 and npm 11.21.3 were used.

| Command | Actual result |
| --- | --- |
| npm ci --ignore-scripts | Exit 0; 479 packages added, 486 audited, zero reported vulnerabilities. |
| npm run lint -- --max-warnings 0 | Exit 0, no warnings. |
| npm run typecheck | Exit 0. |
| npm test | Exit 0: 100 Vitest tests, 19 webhook tests, 45 backend PostgreSQL cases and 50 new midterm PostgreSQL cases passed. |
| npm run build | Exit 0; compilation, TypeScript and all 12 static-generation tasks completed. |

Raw [clean install](midterm-evidence/clean-install.txt),
[lint](midterm-evidence/isolated-lint.txt),
[types](midterm-evidence/isolated-typecheck.txt),
[tests](midterm-evidence/isolated-test.txt), and
[build](midterm-evidence/isolated-build.txt) output are retained. The build was
run outside the Windows filesystem sandbox because prior Next builds encountered
generated-directory permission errors inside it. No fake production credential
was added. Existing Upstash configuration and Node module-format warnings remain
visible; those legacy integrations were not exercised.

Hosted migration, actual Supabase Auth, published exam/services-booking-eval PR,
hosted examination deployment, student personal review, required peer/solo
review, and any unperformed AI-provider checkpoints remain separate evidence.
