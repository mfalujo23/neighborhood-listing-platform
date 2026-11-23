# Release verification

Checked November 23, 2026. [Repository](https://github.com/mfalujo23/neighborhood-listing-platform) · [Integration PR 14](https://github.com/mfalujo23/neighborhood-listing-platform/pull/14) · [Site](https://neighborhood-listing-platform-sable.vercel.app/)

## Verified work

- Production was verified at [ddfa417](https://github.com/mfalujo23/neighborhood-listing-platform/commit/ddfa417dd5f914992a882e3e28deeac06bfc79be). The deployment source and public health response agreed. Hosted checks passed for sign-in, date/property filters, empty results, invalid-input errors without stale results, correction/retry and sign-out denial. Listing search/reset, sponsor navigation and the approved sample listing read also passed. No database writes were performed.
- [CI for ddfa417](https://github.com/mfalujo23/neighborhood-listing-platform/actions/runs/45229586778) passed lint, types, 443 unit/component tests, 21 webhook tests, build and capacity checks. The [local filter receipt](https://github.com/mfalujo23/neighborhood-listing-platform/blob/ddfa417dd5f914992a882e3e28deeac06bfc79be/docs/mfalujo23/evidence/dashboard-filters/verification.json) also records eight browser checks, including keyboard submission and visible focus. Narrow-screen reflow was not verified; the browser remained at 1280 CSS pixels.
- [Hosted evidence](mfalujo23/hosted-reproduction.md) records managed sign-in, role restrictions, booking checks, sample voice callbacks and manual application rollback/restore. Each result keeps its original source and scope. Database restore testing was local.

## Verification limits

Narrow-screen reflow is unverified for the new protected form. The tests do not establish full security/accessibility certification, provider-call performance or hosted database recovery. Historical logs retain their original dates, test counts and decisions. Engineering checks are separate from participant usability testing.
