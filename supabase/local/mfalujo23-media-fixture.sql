-- LOCAL DISPOSABLE FIXTURE ONLY. These rows are not human/admin approval.
create table public.media_asset_records (
  asset_id text primary key, public_path text not null,
  source_path text not null, sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
  approval_status text not null check(approval_status in ('draft','approved','rejected','expired')),
  approval_scope text not null check(approval_scope in ('fixture_test','production')),
  human_reviewed boolean not null default false,
  approval_actor text, approval_date date,
  production_status text not null default 'draft' check(production_status in ('draft','approved','rejected','expired')),
  check(approval_status <> 'approved' or approval_scope='fixture_test'
    or (human_reviewed=true and approval_actor is not null and approval_actor ~ '^[0-9a-f-]{36}$' and approval_date is not null))
);
create table public.marketing_copy_records (
  copy_id text primary key, brief_id text not null,
  copy_text text not null check(char_length(copy_text) between 1 and 120),
  starts_on date not null, ends_on date not null check(ends_on>=starts_on),
  approval_status text not null check(approval_status in ('draft','approved','rejected','expired')),
  approval_scope text not null check(approval_scope in ('fixture_test','production')),
  human_reviewed boolean not null default false, approval_actor text, approval_date date,
  check(approval_status <> 'approved' or approval_scope='fixture_test'
    or (human_reviewed=true and approval_actor is not null and approval_actor ~ '^[0-9a-f-]{36}$' and approval_date is not null))
);
