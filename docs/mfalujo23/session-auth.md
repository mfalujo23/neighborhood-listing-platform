# Account sign-in and protected dashboard

The application now has `/login` with ordinary Email and Password fields, a sign-in action, and a sign-out control. The server calls the official Supabase SDK and verifies `auth.getUser()` before accepting a session. It does not offer public registration, request API keys from users, or assign business roles.

`@supabase/ssr` is pinned to 0.12.7 with the existing Supabase SDK 2.119.0. Server-managed cookies are HttpOnly, SameSite=Lax, path=/, bounded to 7 days and Secure in production. Only the explicit fictional loopback configuration permits local HTTP. The Next 16 Proxy refreshes cookies before rendering; the dashboard makes its own fresh getUser/profile authorization decision. No getSession embedded user is trusted. Cookie updates and redirects must retain anti-cache headers. No token/password is passed through React props, URLs, console logs or non-cookie response headers.

The dashboard uses a request-local cookie client. Existing API factories keep the bearer-only contract; a browser cookie alone cannot call the analytics or CRUD APIs. Protected admin/provider access, historical property-professional read-only compatibility and database ownership/RLS are unchanged. The same RPC and aggregate validation remain in use.

Sign-in/out POSTs require a matching Origin and actual Host/scheme, reject cross-site metadata and do not trust X-Forwarded-Host. Credential JSON is capped at 4 KiB and strict allowed fields. A per-process 20-attempt/minute sign-in budget returns 429/Retry-After; this is neither a distributed nor user/IP account-lockout system. Password bytes are not trimmed. Errors are coarse; no provider diagnostics or account secrets are returned.

## Runtime

Use the existing server `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (legacy `SUPABASE_ANON_KEY` is supported). Do not place a privileged secret in the public-key slot or prefix a secret with NEXT_PUBLIC. No new session encryption secret is introduced. Keep `MIDTERM_LOCAL_FIXTURE_PREVIEW` false/unset for real deployments. `ENABLE_ANALYTICS` and its versioned schema/RPCs are still required for dashboard data; signing in does not silently enable or seed analytics.

## Verification

`npm run verify:source` passes 376 Vitest tests in 31 files, 21 webhook tests, all ten local test phases, strict lint/types and production build. The separate `node --import tsx scripts/verify-auth-session-http.mts` passes 28 actual production-Next HTTP checks against an explicitly fictional local Auth/REST fixture using the actual official SDK. It exercises role restrictions/owned aggregates, expired-cookie refresh, revoked-user denial, logout, CSRF, invalid input and preservation of bearer-only APIs. No real account or provider request is made. Exact evidence is in [auth-session-evidence](auth-session-evidence/verification.json).

Actual hosted browser sign-in, new UI keyboard/axe/zoom/reflow, hosted deployment smoke and rollback remain separate owner checks. The local fixture is not a hosted Auth/RLS certification or human UAT.

## Primary implementation references

- https://supabase.com/docs/guides/auth/server-side/creating-a-client
- https://supabase.com/docs/guides/auth/server-side/advanced-guide
- https://nextjs.org/docs/app/guides/authentication
- https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
