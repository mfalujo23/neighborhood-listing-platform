# Operations runbook

1. Use the reviewed source commit and pinned Node/npm versions. Install with
   `npm ci --ignore-scripts`; run `npm run verify:source` before configuration.
2. Follow the [guarded hosted setup](mfalujo23/hosted-reproduction.md), not a
   replay of every historical migration. Existing-data guards must stop on
   unexpected relations or changed fixtures.
3. Configure private values through host settings. Public keys and privileged
   server credentials have different roles. Keep feature flags off until the
   corresponding authorization and runtime checks pass.
4. Check `/api/health` and its source SHA. It reports liveness, not database or
   carrier readiness. Run actual read/permission and core-flow checks separately.
5. Review coarse errors without contacts, request bodies or secret values.

The [recorded application rollback](mfalujo23/hosted-evidence/index.json) promoted
the existing d0db build and restored 9429. Public pages/health were observed;
six-table fingerprints were unchanged with three bookings preserved. This was
not an automated traffic rollback or database restore.

[Local restore procedures and measurements](mfalujo23/operations-runbook.md)
retain their original checkpoint. They do not prove hosted recovery. Hosted
backup restoration, RPO/RTO, live token-rotation continuity and an automatic
rollback adapter remain untested or incomplete. Preserve existing data and
obtain the required authorization before any recovery action.
