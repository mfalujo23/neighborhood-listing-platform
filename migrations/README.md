# Migration index

The executable migration history is in [`supabase/migrations`](../supabase/migrations).
The reviewed fresh-course-project sequence and exact hashes are in
[`supabase/cloud/classroom`](../supabase/cloud/classroom/source-manifest.json),
with [setup order](../docs/mfalujo23/hosted-reproduction.md).

The core bundle requires an empty approved project and managed Auth. Optional
bundles require the original restored seed and reject existing target objects.
They must not be rerun after preserved booking checks. Do not replay the old
destructive remote export or remove data to defeat a guard.

The merchant-policy [forward repair](../supabase/migrations/20261119000200_sponsor_merchant_draft_permissions.sql)
preserves rows/RPC bodies and rejects unknown policies. Its equivalent guard was
installed in the original sponsor bundle; the later standalone source file has
only the separately recorded local regression execution.
