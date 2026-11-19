# Security review and rejected outputs

## Recorded rejected or qualified recommendations

1. Gemini's seed attempt 1 returned an outer object containing encoded JSON. The actual collection parser rejected it; it was not silently repaired.
2. The midterm critique proposed removing provider access to suspended services. The examination explicitly requires owner modifications in draft/suspended states; that proposed change was rejected for this scope.
3. The critique proposed replacing bookings ON DELETE CASCADE with RESTRICT. CASCADE is an explicit examination requirement, so the change was not applied as an exam fix.
4. Coercing or silently dropping malformed public rows would weaken the selected strict response boundary. The recoverable failure behavior was preserved.
5. A claimed missing trimmed-notes SQL check was false; the existing btrim constraint was inspected. A separate real email-character mismatch was tested and corrected.

[Midterm disposition](../verification/midterm-critique-disposition.json). The later consolidated reviews were independently checked against full source. Three real defects were reproduced and fixed: primitive sponsor-input coercion, reordered analytics-event false conflicts, and a nested environment-filename preflight miss. [Before](../verification/consolidated-before-fixes.json), [after](../verification/consolidated-after-fixes.json), [complete disposition](../../docs/mfalujo23/consolidated-model-review.md). Other omitted-context allegations or unapproved business-policy changes were rejected or qualified rather than applied blindly.

## Actual checks and scope

Historical generic-key hits were safely classified as nine public publishable-client values and four generated Next signing/encryption/cache fields. No privileged service-role leak is inferred from a misleading variable name, and historical material's continued use is unverified. [Safe classification](../verification/history-classification-safe.json).

The final selected-source and client-bundle reports contain zero matches under the recorded redacted Gitleaks run. The source index contains 469 selected files; the scan processed about 2.24 MB of source text and 1.81 MB of client assets. This applies to those scan inputs, not an empty Git history or every future source change. [Source log](../verification/current-source-terminal.log), [client log](../verification/client-bundle-terminal.log). Real local HTTP capacity evidence shows 30 fictional accepted bookings then request 31 blocked with 429/Retry-After. [HTTP record](../verification/booking-capacity-http.json).

Real rendered axe originally found defects; the final local reports show zero violations and zero incomplete findings in the tested states. [Before](../verification/axe-before-fixes.json), [after](../verification/axe-after-fixes-final.json). No WCAG certification, screen-reader run, human UAT or hosted-security assertion is made.

The final evidence validator also checked 11 actual route/state artifacts with zero violations and zero incomplete findings. [Exact validation output](../verification/final-axe-evidence-validation.log).
