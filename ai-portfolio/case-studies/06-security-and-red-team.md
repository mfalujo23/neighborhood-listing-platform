# Security audit and red-team testing

## Original problem
Broad claims of no credentials or secure callbacks required actual bounded scans and adversarial tests, without exposing findings or misclassifying public keys as privileged secrets.

## Initial prompt
Recorded task summary, not a retained exact provider prompt
Use a pinned official Gitleaks release with verified checksums, redaction 100, default rules and no suppression to inspect reachable history and selected source/client bundles. Stop on possible findings and classify only safe metadata.

## AI response summary
The AI coding assistant prepared redacted scans and classified findings by source context, field names and key format. Follow-up requests refined the initial generic-rule hits rather than assuming every high-entropy match was an active provider secret.

## Recorded technical critique
Nine workflow matches were sb_publishable public-client keys even when a variable was named SERVICE_ROLE. Four historical .next fields were generated signing/encryption/cache material. Their active reuse was not established. A zero-findings current scan is not a zero-keys-in-all-history statement.

## Revised prompt / actual revision status
Actual bounded refinement was performed
Inspect only field context and safe structural metadata, distinguish public publishable versus private key types, print no values, perform no provider validation and add no allowlist or baseline.

## Final result
History findings were preserved safely. The earlier 213-file midterm source set and its client bundle had zero matches. The default workflow was repaired without ignored failures. Later source controls reject known public key types in a privileged slot, retire the unsafe legacy webhook and return generic voice fallback without PII or success claims.

## Verification evidence
- Official Gitleaks 8.30.1 artifact and published checksum verification
- 13 redacted historical findings: 9 public-client values + 4 Next-generated fields; no secret values in reports
- Actual invalid-signature HTTP 403 before storage/SMS, duplicate suppression and 5045ms loopback storage-timeout fallback
- 21 webhook tests plus seven staged-token tests; later route/security controls have separate local tests
- No provider credential test, token rotation, shared-history rewrite or current-full-union zero-secret claim is made

The actual paired consolidated critiques led to three independently reproduced fixes: non-string sponsor IDs/ZIPs now fail safely, equivalent reordered analytics events no longer conflict, and nested environment filenames are blocked by a shared recursive preflight. [Before](../verification/consolidated-before-fixes.json), [after](../verification/consolidated-after-fixes.json), [full disposition](../../docs/mfalujo23/consolidated-model-review.md). The actual post-review gate passed 261 Vitest tests, 21 webhook tests, all local SQL/restore groups, build and the isolated HTTP capacity run; this is separate from the earlier review-source checkpoint.

## Related GitHub work
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/pull/6)
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/commit/fe0c8c79932ca40c4ca30809a73c54e76b2e8707)
- [Source / change](https://github.com/mfalujo23/neighborhood-listing-platform/commit/aac017dfe343381d037006a8be72eecd21688f47)

## My decision and lesson

I would accept a security finding after reproducing it against the complete source and an explicit requirement. The sponsor coercion, reordered-event conflict and nested environment-filename cases met that standard and were repaired. I would qualify claims based only on missing excerpts instead of weakening an existing boundary to satisfy a model.

I would keep the safe distinction between public client keys and privileged secrets, and between current scans and historical generated Next.js material. Zero findings in a bounded scan are not an all-history guarantee. The actual application rollback is also separate from database recovery. My lesson is to state the tested control and remaining risk plainly, preserve the real output and avoid a broad security or accessibility certificate.
