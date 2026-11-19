# Historical Build Keys and Workflow Configuration

## Evidence and classification

The Gitleaks 8.30.1 reachable-history scan through backend commit 5a51dcb
reported 13 generic-api-key findings. The
[sanitized classification](midterm-evidence/history-classification-safe.json)
records paths, commits, field names, fingerprints and key-type flags without values.

- Four findings are generated Next development/cache/server-action/preview
  encryption or signing fields committed under .next in cc9698c5.
- Nine workflow findings contain Supabase public-client keys. Every inspected
  assignment has the sb_publishable_ prefix after in-memory decoding, including
  the value placed in the misleading SUPABASE_SERVICE_ROLE_KEY variable.
  None has an sb_secret_ prefix or three-segment JWT syntax.
- Supabase documents publishable keys as public, low-privilege keys suitable for
  source code and browser use. The variable name does not turn such a value into
  a privileged service-role credential. [Supabase API key documentation](https://supabase.com/docs/guides/getting-started/api-keys)
- Historical Next signing/encryption fields remain an exposure finding.
  Their use by an active deployment is unverified. No key was sent to a provider.

A generic scanner match is not proof of an active privileged-secret compromise.
An absolute zero-keys-in-history certification is not made.

## Workflow correction

Default main contains the verified one-file fix:
[aac017d](https://github.com/mfalujo23/neighborhood-listing-platform/commit/aac017dfe343381d037006a8be72eecd21688f47).
It replaces the inherited workflow triggered by pushes to main and pull
requests targeting main. Historical lines31–35 assigned Supabase configuration
literals and mislabeled a public key; the replacement contains no Supabase
assignments or secret references.

The replacement has read-only permissions, no persisted checkout credentials,
locked dependency installation and mandatory lint/type/test/build steps. It
does not deploy or call a database. Its SHA256 is
6400375304a0f4fd7d7ac354d3a35424b3196eecaf7eef6a9617eb04ef965115.
Old-main source errors may fail checks honestly while the toolchain is reviewed.

## Remaining actions

1. Repository owner: inspect Actions and cancel obsolete runs using the inherited
   configuration. Preserve sanitized run metadata.
2. Project owner: review actual grants/RLS using authorized anonymous, owner,
   other-user and administrator tests. No privileged-key leak is established by
   the public-key assignments; public-key publication alone does not require
   shared-project key rotation. The shared project has not been changed.
3. Deployment owner: identify any deployment using the historical Next signing
   or encryption material. Replace/invalidate matching material when necessary.
   Next normally creates a unique Server Function key per build, while
   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY can persist it. The old deployment's
   configuration has not been inspected.
4. Repository owner and instructor: retain the classified historical findings
   and record any required deployment remediation. No teammate history or branch
   has been rewritten. Any requested history cleanup needs an explicit plan.
5. Complete redacted current-source and client-bundle scans, classify findings
   and record the exact source revision. Do not hide historical findings behind
   a broad allowlist or imply that fixing the current file erased history.

## Verification boundary

The current workflow and local application/RLS checks are independently verified.
This history review identifies public-key misconfiguration and committed generated
build keys. It does not establish provider validity, compromise, revocation, or
the configuration of a historical deployment.
